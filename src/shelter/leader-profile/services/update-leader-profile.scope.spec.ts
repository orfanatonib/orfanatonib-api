import { ForbiddenException } from "@nestjs/common";

import { UpdateLeaderProfileService } from "./update-leader-profile.service";

function setup(role: string, targetShelters: string[], led: string[]) {
  const repo = {
    findOneWithSheltersAndMembersOrFail: jest.fn().mockResolvedValue({
      id: "l1",
      teams: targetShelters.map((id) => ({ shelter: { id } })),
    }),
  };
  const auth = {
    tryGetPayload: jest.fn().mockResolvedValue({ role, sub: "u1" }),
  };
  const teams = {
    findLedShelterIds: jest.fn().mockResolvedValue(new Set(led)),
    findByShelter: jest.fn().mockResolvedValue([{ id: "t1", numberTeam: 1 }]),
  };
  const updateTeam = {
    replaceLeaderTeams: jest.fn().mockResolvedValue(undefined),
  };
  const getLeader = { findOne: jest.fn().mockResolvedValue({ id: "l1" }) };
  const svc = new UpdateLeaderProfileService(
    repo as never,
    auth as never,
    getLeader as never,
    teams as never,
    updateTeam as never,
  );
  return { svc, updateTeam };
}

const dto = { assignments: [{ shelterId: "s1", teams: [1] }] };

describe("manageTeams: escopo do líder", () => {
  it("membro e sem papel: 403 antes de qualquer alteração", async () => {
    const { svc, updateTeam } = setup("member", [], []);
    await expect(
      svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateTeam.replaceLeaderTeams).not.toHaveBeenCalled();
  });

  it("líder aloca só em abrigo que lidera", async () => {
    const ok = setup("leader", [], ["s1"]);
    await ok.svc.manageTeams("l1", dto as never, {} as never);
    expect(ok.updateTeam.replaceLeaderTeams).toHaveBeenCalledTimes(1);

    const bad = setup("leader", [], ["outro"]);
    await expect(
      bad.svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(bad.updateTeam.replaceLeaderTeams).not.toHaveBeenCalled();
  });

  it("líder não mexe em quem está em abrigo que ele não lidera (não pode desvincular de equipe alheia)", async () => {
    const { svc, updateTeam } = setup("leader", ["alheio"], ["s1"]);
    await expect(
      svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateTeam.replaceLeaderTeams).not.toHaveBeenCalled();
  });

  it("troca as equipes numa chamada só, com o payload recebido", async () => {
    const { svc, updateTeam } = setup("admin", [], []);
    await svc.manageTeams("l1", dto as never, {} as never);
    expect(updateTeam.replaceLeaderTeams).toHaveBeenCalledWith(
      "l1",
      dto.assignments,
    );
  });

  it("admin gerencia qualquer líder em qualquer abrigo", async () => {
    const { svc, updateTeam } = setup("admin", ["alheio"], []);
    await svc.manageTeams("l1", dto as never, {} as never);
    expect(updateTeam.replaceLeaderTeams).toHaveBeenCalledTimes(1);
  });
});
