/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  ImagePageTransaction,
  ImagePageTransactionRepository,
} from "./image-page-transaction.repository";

describe("ImagePageTransactionRepository", () => {
  it("todas as escritas usam o MESMO EntityManager da transação", async () => {
    const manager = {
      save: jest.fn(async (_t: unknown, d: object) => d),
      remove: jest.fn(async (...a: unknown[]) => a[a.length - 1]),
      findOne: jest.fn(async () => null),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };
    const repo = new ImagePageTransactionRepository(dataSource as never);
    await repo.run(async (tx) => {
      expect(tx.manager).toBe(manager);
      await tx.savePage({ id: "p" });
      await tx.saveSection({ id: "s" });
      await tx.saveMedia({ id: "m" });
      await tx.findMedia("m");
      await tx.removeMedia({ id: "m" } as never);
      await tx.removeSection({ id: "s" } as never);
      await tx.removePage({ id: "p" } as never);
    });
    expect(manager.save).toHaveBeenCalledTimes(3);
    expect(manager.remove).toHaveBeenCalledTimes(3);
    expect(manager.findOne).toHaveBeenCalledTimes(1);
  });

  it("erro dentro do trabalho rejeita (a transação do DataSource desfaz)", async () => {
    const dataSource = {
      transaction: jest.fn((cb: (m: object) => Promise<unknown>) => cb({})),
    };
    const repo = new ImagePageTransactionRepository(dataSource as never);
    await expect(
      repo.run(async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
  });

  it("ImagePageTransaction expõe o manager", () => {
    const m = {} as never;
    expect(new ImagePageTransaction(m).manager).toBe(m);
  });
});
