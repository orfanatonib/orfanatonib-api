/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { MediaCleanupService } from "./media-cleanup.service";
import { MediaReconciliationService } from "./media-reconciliation.service";

describe("MediaCleanupService", () => {
  it("remove da fila quando apaga; incrementa e marca failedAt ao estourar", async () => {
    const ok = { storageKey: "k1", attempts: 0 };
    const bad = {
      storageKey: "k2",
      attempts: 4,
      lastError: null,
      failedAt: null as Date | null,
    };
    const queue = {
      findPending: jest.fn(async () => [ok, bad]),
      remove: jest.fn(),
      save: jest.fn(),
    };
    const s3 = {
      deleteKey: jest.fn(async (k: string) => {
        if (k === "k2") throw new Error("x");
      }),
    };
    const res = await new MediaCleanupService(
      s3 as never,
      queue as never,
    ).processQueue();
    expect(res).toEqual({ removed: 1, failed: 1 });
    expect(queue.remove).toHaveBeenCalledWith(ok);
    expect(bad.attempts).toBe(5);
    expect(bad.failedAt).toBeInstanceOf(Date);
  });
});

describe("MediaReconciliationService", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const old = new Date("2026-11-10T00:00:00Z");
  const fresh = new Date("2026-11-18T11:00:00Z");
  function setup() {
    const s3 = {
      getBucketName: () => "b",
      getEnvironment: () => "local",
      listKeys: jest.fn(async () => [
        { key: "local/E/1/ref.png", lastModified: old },
        { key: "local/E/1/orphan-old.png", lastModified: old },
        { key: "local/E/1/orphan-fresh.png", lastModified: fresh },
      ]),
      deleteKey: jest.fn(async () => undefined),
    };
    const media = {
      findLocalFileUrls: jest.fn(async () => [
        "http://x/b/local/E/1/ref.png",
        "local/E/1/missing.png",
      ]),
    };
    return {
      s3,
      svc: new MediaReconciliationService(s3 as never, media as never),
    };
  }

  it("dry-run reporta sem apagar", async () => {
    const { svc, s3 } = setup();
    const r = await svc.reconcile({ dryRun: true, now });
    expect(r.orphanKeys).toEqual(["local/E/1/orphan-old.png"]);
    expect(r.removedKeys).toEqual([]);
    expect(r.brokenReferences).toEqual(["local/E/1/missing.png"]);
    expect(s3.deleteKey).not.toHaveBeenCalled();
  });

  it("execução apaga só órfão antigo, nunca a referência quebrada nem o recente", async () => {
    const { svc, s3 } = setup();
    const r = await svc.reconcile({ dryRun: false, now });
    expect(r.removedKeys).toEqual(["local/E/1/orphan-old.png"]);
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
  });
});
