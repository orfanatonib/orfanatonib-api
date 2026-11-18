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
  const deleteTeam = {
    removeLeaderFromAllTeams: jest.fn().mockResolvedValue(undefined),
  };
  const updateTeam = {
    addLeadersToTeam: jest.fn().mockResolvedValue(undefined),
  };
  const getLeader = { findOne: jest.fn().mockResolvedValue({ id: "l1" }) };
  const svc = new UpdateLeaderProfileService(
    repo as never,
    auth as never,
    getLeader as never,
    teams as never,
    {} as never,
    updateTeam as never,
    deleteTeam as never,
  );
  return { svc, deleteTeam, updateTeam };
}

const dto = { assignments: [{ shelterId: "s1", teams: [1] }] };

describe("manageTeams: escopo do líder", () => {
  it("membro e sem papel: 403 antes de qualquer alteração", async () => {
    const { svc, deleteTeam } = setup("member", [], []);
    await expect(
      svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteTeam.removeLeaderFromAllTeams).not.toHaveBeenCalled();
  });

  it("líder aloca só em abrigo que lidera", async () => {
    const ok = setup("leader", [], ["s1"]);
    await ok.svc.manageTeams("l1", dto as never, {} as never);
    expect(ok.deleteTeam.removeLeaderFromAllTeams).toHaveBeenCalledTimes(1);

    const bad = setup("leader", [], ["outro"]);
    await expect(
      bad.svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(bad.deleteTeam.removeLeaderFromAllTeams).not.toHaveBeenCalled();
  });

  it("líder não mexe em quem está em abrigo que ele não lidera (não pode desvincular de equipe alheia)", async () => {
    const { svc, deleteTeam } = setup("leader", ["alheio"], ["s1"]);
    await expect(
      svc.manageTeams("l1", dto as never, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteTeam.removeLeaderFromAllTeams).not.toHaveBeenCalled();
  });

  it("admin gerencia qualquer líder em qualquer abrigo", async () => {
    const { svc, deleteTeam } = setup("admin", ["alheio"], []);
    await svc.manageTeams("l1", dto as never, {} as never);
    expect(deleteTeam.removeLeaderFromAllTeams).toHaveBeenCalledTimes(1);
  });
});
