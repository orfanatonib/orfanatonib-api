/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  ImageSectionTransaction,
  ImageSectionTransactionRepository,
} from "./image-section-transaction.repository";

describe("ImageSectionTransactionRepository", () => {
  it("todas as escritas usam o MESMO EntityManager da transação", async () => {
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ id: "s" })),
    };
    const manager = {
      save: jest.fn(async (_t: unknown, d: object) => d),
      remove: jest.fn(async (...a: unknown[]) => a[a.length - 1]),
      findOne: jest.fn(async () => null),
      createQueryBuilder: jest.fn(() => qb),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };
    const repo = new ImageSectionTransactionRepository(dataSource as never);
    await repo.run(async (tx) => {
      expect(tx.manager).toBe(manager);
      expect(await tx.lockSection("s")).toEqual({ id: "s" });
      await tx.findSection("s");
      await tx.saveSection({ id: "s" });
      await tx.saveMedia({ id: "m" });
      await tx.findMedia("m");
      await tx.removeMedia({ id: "m" } as never);
      await tx.removeSection({ id: "s" } as never);
    });
    expect(qb.setLock).toHaveBeenCalledWith("pessimistic_write");
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(manager.remove).toHaveBeenCalledTimes(2);
    expect(manager.findOne).toHaveBeenCalledTimes(2);
  });

  it("erro dentro do trabalho rejeita (a transação do DataSource desfaz)", async () => {
    const dataSource = {
      transaction: jest.fn((cb: (m: object) => Promise<unknown>) => cb({})),
    };
    const repo = new ImageSectionTransactionRepository(dataSource as never);
    await expect(
      repo.run(async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
  });

  it("ImageSectionTransaction expõe o manager", () => {
    const m = {} as never;
    expect(new ImageSectionTransaction(m).manager).toBe(m);
  });
});
