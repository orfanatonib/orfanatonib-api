import { AccessDeniedException } from "src/common/exceptions";
import { NotFoundException } from "@nestjs/common";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { CreateTeamService } from "./create-team.service";
import { DeleteTeamService } from "./delete-team.service";
import { UpdateTeamService } from "./update-team.service";

const admin: ShelterAccessContext = { userId: "a", role: UserRole.ADMIN };
const leader: ShelterAccessContext = { userId: "l", role: UserRole.LEADER };
const member: ShelterAccessContext = { userId: "m", role: UserRole.MEMBER };
const anonymous: ShelterAccessContext = { userId: null, role: null };

const OWN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function setup() {
  const repo = {
    create: jest.fn().mockResolvedValue({ id: "t1" }),
    update: jest.fn().mockResolvedValue({ id: "t1" }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const get = {
    toDto: jest.fn((t: { id: string }) => ({ id: t.id })),
    findLedShelterIds: jest.fn().mockResolvedValue(new Set([OWN])),
    findOne: jest.fn().mockResolvedValue({ id: "t1", shelterId: OWN }),
  };
  return {
    repo,
    get,
    create: new CreateTeamService(repo as never, get as never),
    update: new UpdateTeamService(repo as never, get as never),
    remove: new DeleteTeamService(repo as never, get as never),
  };
}

const dto = (shelterId: string) => ({ numberTeam: 1, shelterId });

describe("escopo de escrita em equipes (POST/PUT/DELETE /teams)", () => {
  describe("create", () => {
    it.each([
      ["membro", member],
      ["sem papel", anonymous],
    ])("%s é negado e nada é gravado", async (_n, actor) => {
      const { create, repo } = setup();
      await expect(create.executeAs(actor, dto(OWN))).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("líder cria no abrigo que lidera", async () => {
      const { create, repo } = setup();
      await create.executeAs(leader, dto(OWN));
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it("líder de OUTRO abrigo é negado", async () => {
      const { create, repo } = setup();
      await expect(create.executeAs(leader, dto(OTHER))).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("admin cria em qualquer abrigo sem consultar liderança", async () => {
      const { create, repo, get } = setup();
      await create.executeAs(admin, dto(OTHER));
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(get.findLedShelterIds).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("membro é negado antes de consultar a equipe", async () => {
      const { update, get, repo } = setup();
      await expect(update.executeAs(member, "t1", {})).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(get.findOne).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("líder do abrigo da equipe atualiza; de outro abrigo é negado", async () => {
      const { update, get, repo } = setup();
      await update.executeAs(leader, "t1", { description: "x" });
      expect(repo.update).toHaveBeenCalledTimes(1);

      repo.update.mockClear();
      get.findOne.mockResolvedValue({ id: "t1", shelterId: OTHER });
      await expect(update.executeAs(leader, "t1", {})).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("equipe inexistente propaga 404 (sem gravar)", async () => {
      const { update, get, repo } = setup();
      get.findOne.mockRejectedValue(new NotFoundException());
      await expect(update.executeAs(admin, "t1", {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("membro negado; líder de outro abrigo negado; nada removido", async () => {
      const { remove, get, repo } = setup();
      await expect(remove.executeAs(member, "t1")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      get.findOne.mockResolvedValue({ id: "t1", shelterId: OTHER });
      await expect(remove.executeAs(leader, "t1")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it("líder do abrigo e admin removem", async () => {
      const { remove, repo } = setup();
      await remove.executeAs(leader, "t1");
      await remove.executeAs(admin, "t1");
      expect(repo.remove).toHaveBeenCalledTimes(2);
    });
  });
});
