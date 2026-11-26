/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import { CreateCelebrationService } from "./create-celebration.service";
import { DeleteCelebrationService } from "./delete-celebration.service";
import { GetCelebrationService } from "./get-celebration.service";
import { UpdateCelebrationService } from "./update-celebration.service";

const SECTION = "section-1";
const USER = "user-1";

const duplicateError = () =>
  Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" });

/** Repositório em memória com o mesmo contrato do índice único (seção+usuário). */
const makeRepository = () => {
  const rows = new Set<string>();
  const key = (s: string, u: string) => `${s}|${u}`;
  return {
    rows,
    insertCelebration: jest.fn(async (s: string, u: string) => {
      if (rows.has(key(s, u))) throw duplicateError();
      rows.add(key(s, u));
    }),
    deleteByUser: jest.fn(async (s: string, u: string) =>
      rows.delete(key(s, u)) ? 1 : 0,
    ),
    countBySection: jest.fn(
      async (s: string) =>
        [...rows].filter((r) => r.startsWith(`${s}|`)).length,
    ),
    existsByUser: jest.fn(async (s: string, u: string) => rows.has(key(s, u))),
    countBySectionIds: jest.fn(async (ids: string[]) => {
      const map = new Map<string, number>();
      for (const id of ids) {
        const n = [...rows].filter((r) => r.startsWith(`${id}|`)).length;
        if (n) map.set(id, n);
      }
      return map;
    }),
    findCelebratedSectionIds: jest.fn(
      async (u: string, ids: string[]) =>
        new Set(ids.filter((id) => rows.has(key(id, u)))),
    ),
  };
};

const setup = (visible = true) => {
  const repository = makeRepository();
  const sections = {
    assertFeedSectionVisible: jest.fn(async () => {
      if (!visible) throw new NotFoundException("Publicação não encontrada.");
    }),
  };
  const create = new CreateCelebrationService(
    repository as never,
    sections as never,
  );
  const remove = new DeleteCelebrationService(repository as never);
  const get = new GetCelebrationService(repository as never, sections as never);
  const update = new UpdateCelebrationService(
    sections as never,
    create,
    remove,
    get,
  );
  return { repository, sections, create, remove, get, update };
};

describe("celebrar: idempotência", () => {
  it("celebrar duas vezes não duplica (segunda devolve false, sem erro)", async () => {
    const { create, repository } = setup();
    await expect(create.celebrate(SECTION, USER)).resolves.toBe(true);
    await expect(create.celebrate(SECTION, USER)).resolves.toBe(false);
    expect(repository.rows.size).toBe(1);
  });

  it("violação do índice único vinda do driver (driverError) também é absorvida", async () => {
    const { create, repository } = setup();
    repository.insertCelebration.mockRejectedValueOnce({
      driverError: { code: "ER_DUP_ENTRY" },
    });
    await expect(create.celebrate(SECTION, USER)).resolves.toBe(false);
  });

  it("erro que não é duplicidade é propagado", async () => {
    const { create, repository } = setup();
    repository.insertCelebration.mockRejectedValueOnce(new Error("boom"));
    await expect(create.celebrate(SECTION, USER)).rejects.toThrow("boom");
  });

  it("descelebrar sem celebração prévia é no-op (false)", async () => {
    const { remove } = setup();
    await expect(remove.uncelebrate(SECTION, USER)).resolves.toBe(false);
  });
});

describe("celebrar: alternar", () => {
  it("liga e desliga, e a contagem acompanha", async () => {
    const { update } = setup();
    expect(await update.toggle(SECTION, USER)).toEqual({
      sectionId: SECTION,
      count: 1,
      celebratedByMe: true,
    });
    expect(await update.toggle(SECTION, USER)).toEqual({
      sectionId: SECTION,
      count: 0,
      celebratedByMe: false,
    });
  });

  it("uma pessoa conta uma vez; outra pessoa soma", async () => {
    const { update } = setup();
    await update.toggle(SECTION, USER);
    const second = await update.toggle(SECTION, "user-2");
    expect(second.count).toBe(2);
    expect(second.celebratedByMe).toBe(true);
  });

  it("corrida: INSERT duplicado durante o toggle não gera erro e termina celebrado", async () => {
    const { update, repository } = setup();
    repository.insertCelebration.mockRejectedValueOnce(duplicateError());
    repository.rows.add(`${SECTION}|${USER}`);
    // deleteByUser do toggle encontra a linha e remove; força o caminho de duplicata
    repository.deleteByUser.mockResolvedValueOnce(0);
    const state = await update.toggle(SECTION, USER);
    expect(state.celebratedByMe).toBe(true);
    expect(state.count).toBe(1);
  });

  it("publicação invisível/inexistente: 404 e nada é gravado", async () => {
    const { update, repository } = setup(false);
    await expect(update.toggle(SECTION, USER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.insertCelebration).not.toHaveBeenCalled();
    expect(repository.deleteByUser).not.toHaveBeenCalled();
  });
});

describe("celebrar: leitura", () => {
  it("visitante recebe só a contagem; celebratedByMe é false e não consulta o usuário", async () => {
    const { get, update, repository, sections } = setup();
    await update.toggle(SECTION, USER);
    const state = await get.getState(SECTION, null);
    expect(state).toEqual({
      sectionId: SECTION,
      count: 1,
      celebratedByMe: false,
    });
    expect(repository.existsByUser).toHaveBeenCalledTimes(1); // só do toggle
    expect(sections.assertFeedSectionVisible).toHaveBeenLastCalledWith(
      SECTION,
      false,
    );
  });

  it("resumo em lote cobre todas as seções, inclusive as sem celebração", async () => {
    const { get, update } = setup();
    await update.toggle("a", USER);
    const summary = await get.summarize(["a", "b"], USER);
    expect(summary.get("a")).toEqual({ count: 1, celebratedByMe: true });
    expect(summary.get("b")).toEqual({ count: 0, celebratedByMe: false });
    const anon = await get.summarize(["a"], null);
    expect(anon.get("a")).toEqual({ count: 1, celebratedByMe: false });
  });

  it("visitante em publicação privada: 404", async () => {
    const { get } = setup(false);
    await expect(get.getState(SECTION, null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
