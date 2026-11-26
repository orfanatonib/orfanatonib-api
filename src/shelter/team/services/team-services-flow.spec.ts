import { ConflictException, NotFoundException } from "@nestjs/common";

import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { CreateTeamService } from "./create-team.service";
import { DeleteTeamService } from "./delete-team.service";
import { UpdateTeamService } from "./update-team.service";

const admin: ShelterAccessContext = { userId: "a", role: UserRole.ADMIN };
const SHELTER = "11111111-1111-4111-8111-111111111111";

function setup() {
  const repo = {
    create: jest.fn().mockResolvedValue({ id: "t1" }),
    update: jest.fn().mockResolvedValue({ id: "t1" }),
    remove: jest.fn().mockResolvedValue(undefined),
    removeLeaderFromAllTeams: jest.fn().mockResolvedValue(undefined),
  };
  const get = {
    toDto: jest.fn((t: { id: string }) => ({ id: t.id })),
    findLedShelterIds: jest.fn().mockResolvedValue(new Set<string>()),
    findOne: jest.fn().mockResolvedValue({ id: "t1", shelterId: SHELTER }),
  };
  return {
    repo,
    get,
    create: new CreateTeamService(repo as never, get as never),
    update: new UpdateTeamService(repo as never, get as never),
    remove: new DeleteTeamService(repo as never, get as never),
  };
}

describe("serviços de equipe: fluxo além do escopo", () => {
  it("create devolve o DTO da equipe criada", async () => {
    const { create, repo } = setup();
    await expect(
      create.executeAs(admin, { numberTeam: 2, shelterId: SHELTER }),
    ).resolves.toEqual({ id: "t1" });
    expect(repo.create).toHaveBeenCalledWith({
      numberTeam: 2,
      shelterId: SHELTER,
    });
  });

  it("número de equipe duplicado: a falha do repositório propaga e nada mais acontece", async () => {
    const { create, repo, get } = setup();
    repo.create.mockRejectedValue(new ConflictException("duplicada"));
    await expect(
      create.executeAs(admin, { numberTeam: 2, shelterId: SHELTER }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(get.toDto).not.toHaveBeenCalled();
  });

  it("update envia só o que veio e devolve o DTO", async () => {
    const { update, repo } = setup();
    await expect(
      update.executeAs(admin, "t1", { description: "nova" } as never),
    ).resolves.toEqual({ id: "t1" });
    expect(repo.update).toHaveBeenCalledWith("t1", { description: "nova" });
  });

  it("update de equipe inexistente é 404 e nada é gravado", async () => {
    const { update, repo, get } = setup();
    get.findOne.mockRejectedValue(new NotFoundException("Team not found"));
    await expect(
      update.executeAs(admin, "x", {} as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("delete de equipe inexistente é 404 e nada é removido", async () => {
    const { remove, repo, get } = setup();
    get.findOne.mockRejectedValue(new NotFoundException("Team not found"));
    await expect(remove.executeAs(admin, "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it("removeLeaderFromAllTeams delega ao repositório (usado ao excluir o perfil de líder)", async () => {
    const { remove, repo } = setup();
    await remove.removeLeaderFromAllTeams("l1");
    expect(repo.removeLeaderFromAllTeams).toHaveBeenCalledWith("l1");
  });
});
