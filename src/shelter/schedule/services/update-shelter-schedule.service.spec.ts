import { ConflictException, NotFoundException } from "@nestjs/common";

import { UpdateShelterScheduleService } from "./update-shelter-schedule.service";

const TEAM = { id: "t1", numberTeam: 1, shelter: { id: "s1", name: "Abrigo" } };

function setup(
  options: {
    schedule?: object | null;
    team?: object | null;
    existing?: { id: string } | null;
  } = {},
) {
  const { schedule = baseSchedule(), team = TEAM, existing = null } = options;
  const repo = {
    findById: jest
      .fn()
      .mockResolvedValueOnce(schedule)
      .mockResolvedValue({ ...baseSchedule(), visitDate: "2026-12-01" }),
    findByTeamIdAndVisitNumber: jest.fn().mockResolvedValue(existing),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const teams = { findOneEntity: jest.fn().mockResolvedValue(team) };
  const events = {
    syncEventsForUpdate: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repo,
    teams,
    events,
    svc: new UpdateShelterScheduleService(
      repo as never,
      teams as never,
      events as never,
    ),
  };
}

function baseSchedule() {
  return {
    id: "sch1",
    visitNumber: 1,
    visitDate: "2026-11-01",
    meetingDate: "2026-10-28",
    lessonContent: "Lição",
    observation: "obs",
    meetingRoom: "sala 1",
    team: { id: "t1" },
  };
}

describe("UpdateShelterScheduleService", () => {
  it("agenda inexistente: 404 e nada é gravado", async () => {
    const { svc, repo, events } = setup({ schedule: null });
    await expect(svc.execute("x", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(events.syncEventsForUpdate).not.toHaveBeenCalled();
  });

  it("número de visita já usado pela equipe: 409 e nada é gravado", async () => {
    const { svc, repo } = setup({ existing: { id: "outra" } });
    await expect(
      svc.execute("sch1", { visitNumber: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("a própria agenda não conta como duplicada", async () => {
    const { svc, repo } = setup({ existing: { id: "sch1" } });
    await svc.execute("sch1", { visitNumber: 1 });
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("nova equipe inexistente: 404 e nada é gravado", async () => {
    const { svc, repo, events } = setup({ team: null });
    await expect(
      svc.execute("sch1", { teamId: "nao-existe" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(events.syncEventsForUpdate).not.toHaveBeenCalled();
  });

  it("equipe da agenda sumiu: 404 ANTES de gravar (não deixa agenda alterada com eventos antigos)", async () => {
    const { svc, repo, teams } = setup();
    teams.findOneEntity.mockResolvedValue(null);
    await expect(
      svc.execute("sch1", { visitDate: "2026-12-01" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("feliz: grava só o que veio e sincroniza os eventos com a equipe resolvida", async () => {
    const { svc, repo, events } = setup();

    await svc.execute("sch1", { visitDate: "2026-12-01" });

    expect(repo.update).toHaveBeenCalledWith("sch1", {
      visitDate: "2026-12-01",
    });
    expect(events.syncEventsForUpdate).toHaveBeenCalledWith(
      "sch1",
      "2026-12-01",
      "2026-10-28",
      "Lição",
      "obs",
      "sala 1",
      TEAM,
    );
  });

  it("trocar a equipe grava a referência por id", async () => {
    const { svc, repo } = setup();
    await svc.execute("sch1", { teamId: "t2" });
    expect(repo.update).toHaveBeenCalledWith("sch1", { team: { id: "t2" } });
  });
});
