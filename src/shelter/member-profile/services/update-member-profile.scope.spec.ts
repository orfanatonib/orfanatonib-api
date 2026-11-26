import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { UpdateMemberProfileService } from "./update-member-profile.service";

function setup(
  role: string | undefined,
  led: string[],
  options: {
    assignment?: { teamId: string; changed: boolean };
    assignFails?: Error;
    notifyFails?: boolean;
  } = {},
) {
  const {
    assignment = { teamId: "t2", changed: true },
    assignFails,
    notifyFails = false,
  } = options;
  const repo = {
    findOneWithShelterAndLeaderOrFail: jest
      .fn()
      .mockResolvedValue({ id: "m1", team: null }),
  };
  const auth = {
    tryGetPayload: jest
      .fn()
      .mockResolvedValue(role ? { role, sub: "u1" } : null),
  };
  const getMember = {
    findOne: jest.fn().mockResolvedValue({
      id: "m1",
      user: { email: "m@x.test", name: "Maria" },
      shelter: { name: "Abrigo", team: { numberTeam: 1 } },
    }),
  };
  const getTeams = {
    findLedShelterIds: jest.fn().mockResolvedValue(new Set(led)),
  };
  const updateTeam = {
    assignMemberToTeam: assignFails
      ? jest.fn().mockRejectedValue(assignFails)
      : jest.fn().mockResolvedValue(assignment),
  };
  const notification = {
    sendTeamAssignmentChanged: notifyFails
      ? jest.fn().mockRejectedValue(new Error("smtp fora"))
      : jest.fn().mockResolvedValue(undefined),
  };
  const svc = new UpdateMemberProfileService(
    repo as never,
    auth as never,
    getMember as never,
    getTeams as never,
    updateTeam as never,
    notification as never,
  );
  return { svc, repo, getMember, updateTeam, notification };
}

const dto = { shelterId: "s1", numberTeam: 2 };
const req = {} as never;

describe("manageTeam: escopo de quem aloca o membro", () => {
  it.each([
    ["membro", "member"],
    ["sem papel", undefined],
  ])(
    "%s é negado antes de consultar ou alterar qualquer coisa",
    async (_n, role) => {
      const { svc, repo, updateTeam } = setup(role, ["s1"]);
      await expect(svc.manageTeam("m1", dto, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.findOneWithShelterAndLeaderOrFail).not.toHaveBeenCalled();
      expect(updateTeam.assignMemberToTeam).not.toHaveBeenCalled();
    },
  );

  it("líder aloca em abrigo que lidera", async () => {
    const { svc, updateTeam } = setup("leader", ["s1"]);
    await svc.manageTeam("m1", dto, req);
    expect(updateTeam.assignMemberToTeam).toHaveBeenCalledTimes(1);
  });

  it("líder NÃO aloca em abrigo que não lidera: 403 e nenhuma equipe é tocada", async () => {
    const { svc, updateTeam } = setup("leader", ["outro"]);
    await expect(svc.manageTeam("m1", dto, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateTeam.assignMemberToTeam).not.toHaveBeenCalled();
  });

  it("admin aloca em qualquer abrigo sem consultar liderança", async () => {
    const { svc, updateTeam } = setup("admin", []);
    await svc.manageTeam("m1", dto, req);
    expect(updateTeam.assignMemberToTeam).toHaveBeenCalledTimes(1);
  });
});

describe("manageTeam: troca de equipe numa operação só", () => {
  it("delega a troca inteira (abrigo, número, membro) a uma única chamada", async () => {
    const { svc, updateTeam } = setup("admin", []);
    await svc.manageTeam("m1", dto, req);
    expect(updateTeam.assignMemberToTeam).toHaveBeenCalledWith("m1", "s1", 2);
  });

  it("a falha da operação (abrigo inexistente) sobe e ninguém é avisado nem relido", async () => {
    const failure = new NotFoundException("Abrigo não encontrado.");
    const { svc, getMember, notification } = setup("admin", [], {
      assignFails: failure,
    });
    await expect(svc.manageTeam("m1", dto, req)).rejects.toBe(failure);
    expect(getMember.findOne).not.toHaveBeenCalled();
    expect(notification.sendTeamAssignmentChanged).not.toHaveBeenCalled();
  });

  it("equipe mudou: avisa o membro por e-mail", async () => {
    const { svc, notification } = setup("admin", []);
    await svc.manageTeam("m1", dto, req);
    expect(notification.sendTeamAssignmentChanged).toHaveBeenCalledTimes(1);
  });

  it("já estava na equipe: repetir o pedido não reenvia o e-mail", async () => {
    const { svc, notification } = setup("admin", [], {
      assignment: { teamId: "t2", changed: false },
    });
    await expect(svc.manageTeam("m1", dto, req)).resolves.toMatchObject({
      id: "m1",
    });
    expect(notification.sendTeamAssignmentChanged).not.toHaveBeenCalled();
  });

  it("falha ao avisar por e-mail não desfaz o vínculo já gravado", async () => {
    const { svc, notification } = setup("admin", [], { notifyFails: true });
    await expect(svc.manageTeam("m1", dto, req)).resolves.toMatchObject({
      id: "m1",
    });
    expect(notification.sendTeamAssignmentChanged).toHaveBeenCalledTimes(1);
  });
});
