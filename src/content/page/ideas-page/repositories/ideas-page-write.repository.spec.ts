/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  IdeasPageTransaction,
  IdeasPageWriteRepository,
} from "./ideas-page-write.repository";

describe("IdeasPageWriteRepository", () => {
  it("transaction usa o EntityManager da transação e propaga o erro (rollback pelo DataSource)", async () => {
    const manager = {};
    const dataSource = {
      transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) =>
        work(manager),
      ),
    };
    const repo = new IdeasPageWriteRepository(dataSource as never);
    await expect(
      repo.transaction(async (tx) => {
        expect(tx.manager).toBe(manager);
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
  });
});

describe("IdeasPageTransaction", () => {
  it("lockPage trava só a linha da página (sem joins eager)", async () => {
    const manager = { findOne: jest.fn(async () => ({ id: "p" })) };
    await new IdeasPageTransaction(manager as never).lockPage("p");
    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" },
      }),
    );
  });

  it("removeMedia e removeSections ignoram lista vazia", async () => {
    const manager = { delete: jest.fn(), remove: jest.fn() };
    const tx = new IdeasPageTransaction(manager as never);
    await tx.removeMedia([]);
    await tx.removeSections([]);
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.remove).not.toHaveBeenCalled();
  });

  it("removePageWithRoute: solta a rota, apaga e confere as seções", async () => {
    const manager = {
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(async () => 1),
    };
    const tx = new IdeasPageTransaction(manager as never);
    const ok = await tx.removePageWithRoute(
      { id: "p", route: { id: "r" } } as never,
      ["s1"],
    );
    expect(ok).toBe(false);
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
      id: "r",
    });
    expect(manager.remove).toHaveBeenCalled();
  });
});
