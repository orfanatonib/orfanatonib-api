import { NotFoundException } from "@nestjs/common";

import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { CreatePagelaService } from "./create-pagela.service";
import { DeletePagelaService } from "./delete-pagela.service";
import { GetPagelasService } from "./get-pagelas.service";
import { UpdatePagelaService } from "./update-pagela.service";
import { getISOWeekYear } from "../week.util";

const actor: ShelterAccessContext = { userId: "u", role: UserRole.LEADER };
const now = new Date("2026-01-05T00:00:00Z");
const entity = (over: object = {}) => ({
  id: "p1",
  sheltered: { id: "s1" },
  member: { id: "m1" },
  referenceDate: "2026-01-05",
  year: 2026,
  visit: 1,
  present: true,
  notes: null,
  createdAt: now,
  updatedAt: now,
  ...over,
});

function setup() {
  const repo = {
    createOne: jest.fn().mockResolvedValue(entity()),
    updateOne: jest.fn().mockResolvedValue(entity()),
    remove: jest.fn().mockResolvedValue(undefined),
    findOneOrFail: jest.fn().mockResolvedValue(entity()),
    findAllSimple: jest.fn().mockResolvedValue([entity()]),
    findAllPaginated: jest
      .fn()
      .mockResolvedValue({ items: [entity()], total: 7 }),
  };
  const access = {
    assertCanAccessSheltered: jest.fn().mockResolvedValue(undefined),
    assertCanAccessPagela: jest.fn().mockResolvedValue(undefined),
    resolveListScope: jest.fn().mockResolvedValue(["sh1"]),
  };
  return {
    repo,
    access,
    create: new CreatePagelaService(repo as never, access as never),
    update: new UpdatePagelaService(repo as never, access as never),
    remove: new DeletePagelaService(repo as never, access as never),
    get: new GetPagelasService(repo as never, access as never),
  };
}

describe("semana ISO (week.util)", () => {
  it.each([
    ["2026-01-05", 2026, 2],
    ["2025-12-29", 2026, 1],
    ["2021-01-03", 2020, 53],
  ])("%s → ano ISO %i semana %i", (date, year, week) => {
    expect(getISOWeekYear(date)).toEqual({ year, week });
  });
});

describe("CreatePagelaService", () => {
  it("deriva o ano da data de referência quando não vem no DTO", async () => {
    const { create, repo } = setup();
    await create.executeAs(actor, {
      shelteredId: "s1",
      memberProfileId: "m1",
      referenceDate: "2025-12-29",
      visit: 1,
      present: true,
    } as never);
    expect(repo.createOne).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, notes: null }),
    );
  });

  it("respeita o ano informado e grava as notas", async () => {
    const { create, repo } = setup();
    await create.executeAs(actor, {
      shelteredId: "s1",
      memberProfileId: "m1",
      referenceDate: "2026-01-05",
      year: 2030,
      visit: 2,
      present: false,
      notes: "n",
    } as never);
    expect(repo.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2030,
        visit: 2,
        present: false,
        notes: "n",
      }),
    );
  });

  it("sem acesso ao abrigo: erro do guard de escopo e nada é gravado", async () => {
    const { create, repo, access } = setup();
    access.assertCanAccessSheltered.mockRejectedValue(new NotFoundException());
    await expect(
      create.executeAs(actor, { shelteredId: "x" } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.createOne).not.toHaveBeenCalled();
  });

  it("falha do repositório propaga", async () => {
    const { create, repo } = setup();
    repo.createOne.mockRejectedValue(new Error("db"));
    await expect(
      create.executeAs(actor, {
        shelteredId: "s1",
        referenceDate: "2026-01-05",
      } as never),
    ).rejects.toThrow("db");
  });
});

describe("UpdatePagelaService", () => {
  it("atualização parcial: só os campos informados, membro vira referência por id", async () => {
    const { update, repo } = setup();
    await update.executeAs(actor, "p1", {
      present: false,
      memberProfileId: "m2",
    } as never);
    expect(repo.updateOne).toHaveBeenCalledWith("p1", {
      member: { id: "m2" },
      referenceDate: undefined,
      year: undefined,
      visit: undefined,
      present: false,
      notes: undefined,
    });
  });

  it("sem acesso à pagela: nada é alterado", async () => {
    const { update, repo, access } = setup();
    access.assertCanAccessPagela.mockRejectedValue(new NotFoundException());
    await expect(
      update.executeAs(actor, "p1", {} as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.updateOne).not.toHaveBeenCalled();
  });
});

describe("DeletePagelaService", () => {
  it("remove depois de checar o escopo", async () => {
    const { remove, repo, access } = setup();
    await remove.executeAs(actor, "p1");
    expect(access.assertCanAccessPagela).toHaveBeenCalledWith("p1", actor);
    expect(repo.remove).toHaveBeenCalledWith("p1");
  });

  it("sem acesso: nada é removido", async () => {
    const { remove, repo, access } = setup();
    access.assertCanAccessPagela.mockRejectedValue(new NotFoundException());
    await expect(remove.executeAs(actor, "p1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });
});

describe("GetPagelasService", () => {
  it("lista paginada usa o escopo resolvido e devolve total/página/limite", async () => {
    const { get, repo, access } = setup();
    const res = await get.findAllPaginatedAs(
      actor,
      { shelteredId: "s1" } as never,
      2,
      5,
    );
    expect(access.resolveListScope).toHaveBeenCalledWith("s1", actor);
    expect(repo.findAllPaginated).toHaveBeenCalledWith(
      { shelteredId: "s1" },
      2,
      5,
      ["sh1"],
    );
    expect(res).toMatchObject({ total: 7, page: 2, limit: 5 });
    expect(res.items).toHaveLength(1);
  });

  it("lista simples sem filtro também passa pelo escopo", async () => {
    const { get, repo, access } = setup();
    await get.findAllSimpleAs(actor, {} as never);
    expect(access.resolveListScope).toHaveBeenCalledWith(undefined, actor);
    expect(repo.findAllSimple).toHaveBeenCalledWith({}, ["sh1"]);
  });

  it("detalhe: checa o escopo antes de ler", async () => {
    const { get, repo, access } = setup();
    access.assertCanAccessPagela.mockRejectedValue(new NotFoundException());
    await expect(get.findOneAs(actor, "p1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.findOneOrFail).not.toHaveBeenCalled();
  });

  it("detalhe feliz devolve o DTO", async () => {
    const { get } = setup();
    await expect(get.findOneAs(actor, "p1")).resolves.toMatchObject({
      id: "p1",
    });
  });
});
