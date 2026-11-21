import {
  Injectable,
  Logger,
  Optional,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";

import { FEATURE_FLAGS_INVALIDATION_CHANNEL } from "../constants";
import {
  FeatureFlagInvalidationMessage,
  FeatureFlagInvalidationTransport,
  RemoteInvalidationHandler,
} from "../types";

const REDIS_CONNECT_TIMEOUT_MS = 2_000;
const REDIS_RETRY_MAX_MS = 30_000;

/**
 * Avisa as outras instâncias quando uma flag muda, para que o cache em
 * memória delas seja descartado na hora (e não só no fim do TTL).
 *
 * É **opcional**: sem `REDIS_URL` (ou com `FEATURE_FLAGS_BUS=memory`) nada é
 * criado e o cache segue só com TTL curto. Falha de Redis nunca derruba o
 * boot nem a escrita da flag: o TTL continua sendo a garantia de convergência.
 */
@Injectable()
export class FeatureFlagsInvalidationBus
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(FeatureFlagsInvalidationBus.name);
  /** Distingue o eco das próprias mensagens. */
  readonly instanceId = randomUUID();
  private readonly handlers: RemoteInvalidationHandler[] = [];
  private transport: FeatureFlagInvalidationTransport | null = null;

  constructor(@Optional() private readonly config?: ConfigService) {}

  onModuleInit(): void {
    const url = this.config?.get<string>("REDIS_URL")?.trim();
    const mode = (this.config?.get<string>("FEATURE_FLAGS_BUS") ?? "")
      .trim()
      .toLowerCase();
    if (!url || mode === "memory") return;
    // Sem await: com o Redis fora do ar o subscribe só conclui na reconexão e
    // não pode segurar o boot.
    void this.attach(createRedisTransport(url, this.logger));
  }

  async onModuleDestroy(): Promise<void> {
    await this.transport?.close().catch(() => undefined);
    this.transport = null;
  }

  /** Ligação explícita (também usada pelos testes, com um transporte falso). */
  async attach(transport: FeatureFlagInvalidationTransport): Promise<void> {
    this.transport = transport;
    try {
      await transport.subscribe((raw) => this.receive(raw));
    } catch (error: unknown) {
      this.logger.warn(
        `Invalidação entre instâncias indisponível (cache só por TTL): ${describe(error)}`,
      );
    }
  }

  get isActive(): boolean {
    return this.transport !== null;
  }

  onRemoteInvalidation(handler: RemoteInvalidationHandler): void {
    this.handlers.push(handler);
  }

  /** Fire-and-forget: nunca lança. `key = null` invalida tudo. */
  publish(key: string | null): void {
    if (!this.transport) return;
    const message: FeatureFlagInvalidationMessage = {
      origin: this.instanceId,
      key,
    };
    this.transport.publish(JSON.stringify(message)).catch((error: unknown) => {
      this.logger.warn(`Falha ao publicar invalidação: ${describe(error)}`);
    });
  }

  private receive(raw: string): void {
    let message: FeatureFlagInvalidationMessage;
    try {
      message = JSON.parse(raw) as FeatureFlagInvalidationMessage;
    } catch {
      return;
    }
    if (!message || message.origin === this.instanceId) return;
    const key = typeof message.key === "string" ? message.key : null;
    for (const handler of this.handlers) handler(key);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createRedisTransport(
  url: string,
  logger: Logger,
): FeatureFlagInvalidationTransport {
  const options = {
    lazyConnect: false,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (attempt: number) =>
      Math.min(attempt * 1_000, REDIS_RETRY_MAX_MS),
  };
  const publisher = new Redis(url, options);
  const subscriber = new Redis(url, { ...options, enableOfflineQueue: true });
  let warned = false;
  const onError = (error: Error): void => {
    if (warned) return;
    warned = true;
    logger.warn(`Redis das feature flags indisponível: ${error.message}`);
  };
  publisher.on("error", onError);
  subscriber.on("error", onError);
  subscriber.on("ready", () => {
    warned = false;
  });

  return {
    publish: async (message) => {
      await publisher.publish(FEATURE_FLAGS_INVALIDATION_CHANNEL, message);
    },
    subscribe: async (onMessage) => {
      subscriber.on("message", (_channel: string, message: string) =>
        onMessage(message),
      );
      await subscriber.subscribe(FEATURE_FLAGS_INVALIDATION_CHANNEL);
    },
    close: () => {
      publisher.disconnect();
      subscriber.disconnect();
      return Promise.resolve();
    },
  };
}
