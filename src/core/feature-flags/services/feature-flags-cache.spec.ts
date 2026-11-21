import {
  FEATURE_FLAGS_CACHE_TTL_MS,
  FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS,
} from "../constants";
import { FeatureFlagInvalidationTransport } from "../types";
import { FeatureFlagsInvalidationBus } from "./feature-flags-invalidation.bus";
import { GetFeatureFlagsService } from "./get-feature-flags.service";

import { FeatureFlagsRepository } from "../feature-flags.repository";

class FakeTransport implements FeatureFlagInvalidationTransport {
  static readonly instances: FakeTransport[] = [];
  private listener: ((message: string) => void) | null = null;
  published: string[] = [];
  closed = false;
  failPublish = false;

  constructor() {
    FakeTransport.instances.push(this);
  }

  publish(message: string): Promise<void> {
    if (this.failPublish) return Promise.reject(new Error("redis fora"));
    this.published.push(message);
    for (const other of FakeTransport.instances) {
      if (other !== this) other.listener?.(message);
    }
    return Promise.resolve();
  }

  subscribe(onMessage: (message: string) => void): Promise<void> {
    this.listener = onMessage;
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

function buildInstance(enabledRef: { value: boolean }) {
  const repository = {
    findByKey: jest.fn((key: string) =>
      Promise.resolve({ key, enabled: enabledRef.value, metadata: null }),
    ),
    findEnabledState: jest.fn(),
    findAll: jest.fn(),
  };
  const bus = new FeatureFlagsInvalidationBus();
  const service = new GetFeatureFlagsService(
    repository as unknown as FeatureFlagsRepository,
    bus,
  );
  return { repository, bus, service };
}

describe("cache de feature flags entre instâncias", () => {
  beforeEach(() => {
    FakeTransport.instances.length = 0;
  });

  it("sem barramento, o serviço funciona só com TTL (Redis é opcional)", async () => {
    const repository = {
      findByKey: jest
        .fn()
        .mockResolvedValue({ key: "a", enabled: true, metadata: null }),
    };
    const service = new GetFeatureFlagsService(
      repository as unknown as FeatureFlagsRepository,
    );
    await service.isEnabledForRole("a", null);
    service.invalidate("a");
    await service.isEnabledForRole("a", null);
    expect(repository.findByKey).toHaveBeenCalledTimes(2);
  });

  it("invalidar na instância A derruba o cache da instância B (e não faz eco)", async () => {
    const state = { value: true };
    const a = buildInstance(state);
    const b = buildInstance(state);
    await a.bus.attach(new FakeTransport());
    await b.bus.attach(new FakeTransport());

    await b.service.isEnabledForRole("pagelas", null);
    expect(await b.service.isEnabledForRole("pagelas", null)).toBe(true);
    expect(b.repository.findByKey).toHaveBeenCalledTimes(1);

    state.value = false;
    a.service.invalidate("pagelas");

    expect(await b.service.isEnabledForRole("pagelas", null)).toBe(false);
    expect(b.repository.findByKey).toHaveBeenCalledTimes(2);
    expect(FakeTransport.instances[1].published).toHaveLength(0);
  });

  it("invalidateAll remove tudo nas outras instâncias", async () => {
    const state = { value: true };
    const a = buildInstance(state);
    const b = buildInstance(state);
    await a.bus.attach(new FakeTransport());
    await b.bus.attach(new FakeTransport());
    await b.service.isEnabledForRole("x", null);
    await b.service.isEnabledForRole("y", null);

    a.service.invalidateAll();
    await b.service.isEnabledForRole("x", null);
    await b.service.isEnabledForRole("y", null);

    expect(b.repository.findByKey).toHaveBeenCalledTimes(4);
  });

  it("mensagem inválida ou do próprio emissor é ignorada", async () => {
    const state = { value: true };
    const a = buildInstance(state);
    const transport = new FakeTransport();
    await a.bus.attach(transport);
    await a.service.isEnabledForRole("x", null);

    const listener = (
      transport as unknown as {
        listener: (m: string) => void;
      }
    ).listener;
    listener("não é json");
    listener(JSON.stringify({ origin: a.bus.instanceId, key: "x" }));
    await a.service.isEnabledForRole("x", null);

    expect(a.repository.findByKey).toHaveBeenCalledTimes(1);
  });

  it("falha ao publicar não lança (o TTL garante a convergência)", async () => {
    const a = buildInstance({ value: true });
    const transport = new FakeTransport();
    transport.failPublish = true;
    await a.bus.attach(transport);

    expect(() => a.service.invalidate("x")).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it("onModuleDestroy fecha o transporte", async () => {
    const bus = new FeatureFlagsInvalidationBus();
    const transport = new FakeTransport();
    await bus.attach(transport);
    expect(bus.isActive).toBe(true);
    await bus.onModuleDestroy();
    expect(transport.closed).toBe(true);
    expect(bus.isActive).toBe(false);
  });

  describe("TTL", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("flag email_* expira em segundos; as demais mantêm o TTL longo", async () => {
      expect(FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS).toBeLessThan(
        FEATURE_FLAGS_CACHE_TTL_MS,
      );
      const state = { value: true };
      const { service, repository } = buildInstance(state);

      await service.isEnabledForRole("email_delivery", null);
      await service.isEnabledForRole("pagelas", null);
      jest.advanceTimersByTime(FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS + 1);
      await service.isEnabledForRole("email_delivery", null);
      await service.isEnabledForRole("pagelas", null);

      const keys = repository.findByKey.mock.calls.map(([key]) => key);
      expect(keys.filter((key) => key === "email_delivery")).toHaveLength(2);
      expect(keys.filter((key) => key === "pagelas")).toHaveLength(1);

      jest.advanceTimersByTime(FEATURE_FLAGS_CACHE_TTL_MS);
      await service.isEnabledForRole("pagelas", null);
      expect(
        repository.findByKey.mock.calls.filter(([key]) => key === "pagelas"),
      ).toHaveLength(2);
    });
  });
});
