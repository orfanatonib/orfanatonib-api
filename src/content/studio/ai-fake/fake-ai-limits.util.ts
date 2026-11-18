/**
 * Limites simulados do provedor de IA para os E2E (`AI_PROVIDER_MODE=fake`).
 * Um LLM real NUNCA é chamado nos testes: o prompt pode carregar diretivas
 * `[[fake:<nome>]]` que fazem o gateway falso reproduzir a falha correspondente.
 */

export enum FakeAiFailure {
  RATE_LIMIT = "429",
  QUOTA = "quota",
  TIMEOUT = "timeout",
  MODERATION = "moderation",
  SERVER_ERROR = "500",
  INVALID_SCHEMA = "schema",
  NETWORK = "network",
}

export interface FakeAiFailureDescriptor {
  failure: FakeAiFailure;
  /** Status HTTP que o provedor real devolveria (null = sem resposta HTTP). */
  httpStatus: number | null;
  retryable: boolean;
  /** `Retry-After` simulado, em segundos. */
  retryAfterSeconds?: number;
}

const FAILURES: Readonly<Record<FakeAiFailure, FakeAiFailureDescriptor>> = {
  [FakeAiFailure.RATE_LIMIT]: {
    failure: FakeAiFailure.RATE_LIMIT,
    httpStatus: 429,
    retryable: true,
    retryAfterSeconds: 2,
  },
  [FakeAiFailure.QUOTA]: {
    failure: FakeAiFailure.QUOTA,
    httpStatus: 429,
    retryable: false,
  },
  [FakeAiFailure.TIMEOUT]: {
    failure: FakeAiFailure.TIMEOUT,
    httpStatus: null,
    retryable: true,
  },
  [FakeAiFailure.MODERATION]: {
    failure: FakeAiFailure.MODERATION,
    httpStatus: 400,
    retryable: false,
  },
  [FakeAiFailure.SERVER_ERROR]: {
    failure: FakeAiFailure.SERVER_ERROR,
    httpStatus: 500,
    retryable: true,
  },
  [FakeAiFailure.INVALID_SCHEMA]: {
    failure: FakeAiFailure.INVALID_SCHEMA,
    httpStatus: 200,
    retryable: false,
  },
  [FakeAiFailure.NETWORK]: {
    failure: FakeAiFailure.NETWORK,
    httpStatus: null,
    retryable: true,
  },
};

const DIRECTIVE = /\[\[fake:([a-z0-9]+)(?::(\d+))?\]\]/gi;

export interface FakeDirective {
  descriptor: FakeAiFailureDescriptor;
  /** Quantas vezes falha antes de funcionar (`[[fake:429:2]]` = 2 falhas, depois sucesso). */
  failTimes: number;
}

/** Extrai a primeira diretiva reconhecida do texto; ignora nomes desconhecidos. */
export function parseFakeDirective(text: string): FakeDirective | null {
  for (const match of text.matchAll(DIRECTIVE)) {
    const name = match[1].toLowerCase();
    const descriptor = Object.values(FAILURES).find((d) => String(d.failure) === name);
    if (descriptor) {
      return {
        descriptor,
        failTimes: match[2]
          ? Math.max(1, Number(match[2]))
          : Number.POSITIVE_INFINITY,
      };
    }
  }
  return null;
}

/** Contador de falhas por chave (ex.: jobId) para `[[fake:429:2]]`. */
export class FakeFailureCounter {
  private readonly counts = new Map<string, number>();

  /** `true` se esta chamada deve falhar. */
  shouldFail(key: string, directive: FakeDirective): boolean {
    const used = this.counts.get(key) ?? 0;
    if (used >= directive.failTimes) return false;
    this.counts.set(key, used + 1);
    return true;
  }
}

/** Cota simulada de tokens: esgotada, o gateway falso responde como `quota`. */
export class FakeTokenQuota {
  private remaining: number;

  constructor(private readonly total: number) {
    this.remaining = Math.max(0, Math.floor(total));
  }

  /** Consome; `false` quando não há saldo (nada é consumido). */
  consume(tokens: number): boolean {
    if (tokens > this.remaining) return false;
    this.remaining -= tokens;
    return true;
  }

  get left(): number {
    return this.remaining;
  }

  reset(): void {
    this.remaining = Math.max(0, Math.floor(this.total));
  }
}

/** Estimativa grosseira e determinística de tokens (4 caracteres ≈ 1 token). */
export const estimateTokens = (text: string): number =>
  Math.max(1, Math.ceil(text.length / 4));

/**
 * `fake` é proibido em produção (o boot já recusa — plano 01); esta guarda é a
 * segunda barreira para código que decide o provedor em tempo de execução.
 */
export function isFakeModeAllowed(
  mode: string | undefined,
  environment: string | undefined,
): boolean {
  if (mode !== "fake") return false;
  return !["prod", "production"].includes((environment ?? "").toLowerCase());
}
