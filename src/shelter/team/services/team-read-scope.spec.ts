import { NotFoundException } from "@nestjs/common";
import { AccessDeniedException } from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { GetTeamsService } from "./get-teams.service";

const admin: ShelterAccessContext = { userId: "a", role: UserRole.ADMIN };
const leader: ShelterAccessContext = { userId: "l", role: UserRole.LEADER };
const member: ShelterAccessContext = { userId: "m", role: UserRole.MEMBER };
const anonymous: ShelterAccessContext = { userId: null, role: null };

const OWN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const entity = (id: string, shelterId: string) => ({
  id,
  numberTeam: 1,
  description: "",
  shelter: { id: shelterId, name: "Abrigo" },
  leaders: [],
  members: [],
});

function setup() {
  const repo = {
    findAll: jest
      .fn()
      .mockResolvedValue([entity("t-own", OWN), entity("t-other", OTHER)]),
    findOne: jest.fn((id: string) =>
      Promise.resolve(
        id === "t-own"
          ? entity("t-own", OWN)
          : id === "t-other"
            ? entity("t-other", OTHER)
            : null,
      ),
    ),
    findByShelter: jest
      .fn()
      .mockImplementation((shelterId: string) =>
        Promise.resolve([entity(`t-${shelterId}`, shelterId)]),
      ),
    findLeaderProfileByUserId: jest.fn().mockResolvedValue({ id: "lp1" }),
    findByLeader: jest.fn().mockResolvedValue([entity("t-own", OWN)]),
  };
  return { repo, service: new GetTeamsService(repo as never) };
}

describe("escopo de leitura em equipes (GET /teams, /by-shelter/:id, /:id)", () => {
  describe("findAllAs", () => {
    it.each([
      ["membro", member],
      ["sem papel", anonymous],
    ])("%s é negado antes de consultar o banco", async (_n, actor) => {
      const { service, repo } = setup();
      await expect(service.findAllAs(actor)).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.findAll).not.toHaveBeenCalled();
    });

    it("admin lê todas as equipes", async () => {
      const { service } = setup();
      const teams = await service.findAllAs(admin);
      expect(teams.map((t) => t.id)).toEqual(["t-own", "t-other"]);
    });

    it("líder lê só as equipes dos abrigos que lidera", async () => {
      const { service } = setup();
      const teams = await service.findAllAs(leader);
      expect(teams.map((t) => t.id)).toEqual(["t-own"]);
    });
  });

  describe("findByShelterAs", () => {
    it("membro é negado e o banco não é consultado", async () => {
      const { service, repo } = setup();
      await expect(service.findByShelterAs(member, OWN)).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.findByShelter).not.toHaveBeenCalled();
    });

    it("líder lê o abrigo que lidera", async () => {
      const { service } = setup();
      const teams = await service.findByShelterAs(leader, OWN);
      expect(teams).toHaveLength(1);
    });

    it("líder de OUTRO abrigo é negado e nada é devolvido", async () => {
      const { service, repo } = setup();
      await expect(
        service.findByShelterAs(leader, OTHER),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      expect(repo.findByShelter).not.toHaveBeenCalled();
    });

    it("admin lê qualquer abrigo", async () => {
      const { service } = setup();
      await expect(service.findByShelterAs(admin, OTHER)).resolves.toHaveLength(
        1,
      );
    });
  });

  describe("findOneAs", () => {
    it("membro é negado", async () => {
      const { service } = setup();
      await expect(service.findOneAs(member, "t-own")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });

    it("equipe inexistente responde 404", async () => {
      const { service } = setup();
      await expect(service.findOneAs(admin, "nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("líder lê equipe do próprio abrigo, não a de outro", async () => {
      const { service } = setup();
      await expect(service.findOneAs(leader, "t-own")).resolves.toMatchObject({
        id: "t-own",
      });
      await expect(service.findOneAs(leader, "t-other")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
    });

    it("admin lê qualquer equipe", async () => {
      const { service } = setup();
      await expect(service.findOneAs(admin, "t-other")).resolves.toMatchObject({
        id: "t-other",
      });
    });
  });
});
