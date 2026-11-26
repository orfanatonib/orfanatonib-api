import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { CreatePagelaService } from "./create-pagela.service";
import { DeletePagelaService } from "./delete-pagela.service";
import { GetPagelasService } from "./get-pagelas.service";
import { PagelaAccessService } from "./pagela-access.service";
import { UpdatePagelaService } from "./update-pagela.service";

const admin: ShelterAccessContext = { userId: "a", role: UserRole.ADMIN };
const leader: ShelterAccessContext = { userId: "l", role: UserRole.LEADER };
const member: ShelterAccessContext = { userId: "m", role: UserRole.MEMBER };
const anonymous: ShelterAccessContext = { userId: null, role: null };
const SHELTERED = "11111111-1111-4111-8111-111111111111";

function setup(reachable = true) {
  const repo = {
    findShelterIdOfSheltered: jest.fn().mockResolvedValue("shelter-1"),
    findScopeOfPagela: jest
      .fn()
      .mockResolvedValue({ shelteredId: SHELTERED, shelterId: "shelter-1" }),
    createOne: jest.fn().mockResolvedValue({ id: "p1" }),
    updateOne: jest.fn().mockResolvedValue({ id: "p1" }),
    remove: jest.fn().mockResolvedValue(undefined),
    findOneOrFail: jest.fn().mockResolvedValue({ id: "p1" }),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findAllSimple: jest.fn().mockResolvedValue([]),
  };
  const shelters = {
    existsForActor: jest.fn().mockResolvedValue(reachable),
    findShelterIdsForLeader: jest.fn().mockResolvedValue(["shelter-1"]),
  };
  const access = new PagelaAccessService(repo as never, shelters as never);
  return {
    repo,
    shelters,
    create: new CreatePagelaService(repo as never, access),
    update: new UpdatePagelaService(repo as never, access),
    remove: new DeletePagelaService(repo as never, access),
    get: new GetPagelasService(repo as never, access),
  };
}

const createDto = {
  shelteredId: SHELTERED,
  memberProfileId: "m",
  referenceDate: "2026-11-02",
  visit: 1,
  present: true,
};

describe("escopo das pagelas (/pagelas)", () => {
  describe("escrita", () => {
    it("sem papel: 403 e nada gravado", async () => {
      const { create, update, remove, repo } = setup();
      await expect(
        create.executeAs(anonymous, createDto as never),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      await expect(
        update.executeAs(anonymous, "p1", {}),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      await expect(remove.executeAs(anonymous, "p1")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.createOne).not.toHaveBeenCalled();
      expect(repo.updateOne).not.toHaveBeenCalled();
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it.each([
      ["membro", member],
      ["líder", leader],
    ])(
      "%s de OUTRO abrigo recebe 404 (sem vazar existência) e nada é gravado",
      async (_n, actor) => {
        const { create, update, remove, repo } = setup(false);
        await expect(
          create.executeAs(actor, createDto as never),
        ).rejects.toBeInstanceOf(ResourceNotFoundException);
        await expect(update.executeAs(actor, "p1", {})).rejects.toBeInstanceOf(
          ResourceNotFoundException,
        );
        await expect(remove.executeAs(actor, "p1")).rejects.toBeInstanceOf(
          ResourceNotFoundException,
        );
        expect(repo.createOne).not.toHaveBeenCalled();
        expect(repo.updateOne).not.toHaveBeenCalled();
        expect(repo.remove).not.toHaveBeenCalled();
      },
    );

    it("quem alcança o abrigo do acolhido grava", async () => {
      const { create, update, remove, repo } = setup(true);
      await create.executeAs(leader, createDto as never);
      await update.executeAs(member, "p1", {});
      await remove.executeAs(leader, "p1");
      expect(repo.createOne).toHaveBeenCalledTimes(1);
      expect(repo.updateOne).toHaveBeenCalledTimes(1);
      expect(repo.remove).toHaveBeenCalledTimes(1);
    });

    it("admin grava sem consultar abrigo; pagela inexistente é 404 até para admin em update/delete", async () => {
      const { create, update, repo, shelters } = setup(false);
      await create.executeAs(admin, createDto as never);
      expect(shelters.existsForActor).not.toHaveBeenCalled();
      repo.findScopeOfPagela.mockResolvedValue(null);
      await expect(update.executeAs(admin, "x", {})).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it("acolhido sem abrigo: 404 para não-admin", async () => {
      const { create, repo } = setup(true);
      repo.findShelterIdOfSheltered.mockResolvedValue(null);
      await expect(
        create.executeAs(leader, createDto as never),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe("leitura", () => {
    it("GET /:id fora do escopo: 404", async () => {
      const { get } = setup(false);
      await expect(get.findOneAs(member, "p1")).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it("listagem com shelteredId alcançável passa sem filtro extra; fora do escopo 404", async () => {
      const ok = setup(true);
      await ok.get.findAllPaginatedAs(
        member,
        { shelteredId: SHELTERED },
        1,
        20,
      );
      expect(ok.repo.findAllPaginated).toHaveBeenCalledWith(
        { shelteredId: SHELTERED },
        1,
        20,
        undefined,
      );
      const bad = setup(false);
      await expect(
        bad.get.findAllPaginatedAs(member, { shelteredId: SHELTERED }, 1, 20),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });

    it("listagem sem shelteredId: admin vê tudo; líder só os abrigos que lidera; membro recebe 403", async () => {
      const s = setup();
      await s.get.findAllPaginatedAs(admin, {}, 1, 20);
      expect(s.repo.findAllPaginated).toHaveBeenLastCalledWith(
        {},
        1,
        20,
        undefined,
      );
      await s.get.findAllPaginatedAs(leader, {}, 1, 20);
      expect(s.repo.findAllPaginated).toHaveBeenLastCalledWith({}, 1, 20, [
        "shelter-1",
      ]);
      await expect(
        s.get.findAllPaginatedAs(member, {}, 1, 20),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      await expect(s.get.findAllSimpleAs(member, {})).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });
  });
});
