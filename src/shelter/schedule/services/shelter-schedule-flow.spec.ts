import { ConflictException, Logger, NotFoundException } from "@nestjs/common";

import { CreateShelterScheduleService } from "./create-shelter-schedule.service";
import { DeleteShelterScheduleService } from "./delete-shelter-schedule.service";
import { ListShelterSchedulesService } from "./list-shelter-schedules.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "log").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const dto = {
  teamId: "t1",
  visitNumber: 3,
  visitDate: "2026-12-01",
  meetingDate: "2026-12-02",
} as never;

describe("CreateShelterScheduleService.execute", () => {
  function setup() {
    const repo = {
      findByTeamIdAndVisitNumber: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "sch1" }),
      findById: jest.fn().mockResolvedValue({ id: "sch1", full: true }),
    };
    const teams = {
      findOneEntity: jest
        .fn()
        .mockResolvedValue({ id: "t1", shelter: { id: "s1" } }),
    };
    const events = {
      syncEventsForCreate: jest.fn().mockResolvedValue(undefined),
    };
    return {
      repo,
      teams,
      events,
      svc: new CreateShelterScheduleService(
        repo as never,
        teams as never,
        events as never,
      ),
    };
  }

  it("feliz: grava, sincroniza os eventos e devolve a agenda completa", async () => {
    const { svc, repo, events } = setup();
    await expect(svc.execute(dto)).resolves.toEqual({ id: "sch1", full: true });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ visitNumber: 3, team: { id: "t1" } }),
    );
    expect(events.syncEventsForCreate).toHaveBeenCalledTimes(1);
  });

  it("equipe inexistente: 404 e nada é gravado", async () => {
    const { svc, repo, teams } = setup();
    teams.findOneEntity.mockResolvedValue(null);
    await expect(svc.execute(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("visita duplicada para a mesma equipe: 409 e nada é gravado", async () => {
    const { svc, repo } = setup();
    repo.findByTeamIdAndVisitNumber.mockResolvedValue({ id: "old" });
    await expect(svc.execute(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("DeleteShelterScheduleService.execute", () => {
  function setup() {
    const scheduleRepo = {
      findById: jest.fn().mockResolvedValue({ id: "sch1" }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const eventRepo = {
      findByScheduleId: jest
        .fn()
        .mockResolvedValue([{ id: "e1" }, { id: "e2" }]),
    };
    const deleteEvent = { remove: jest.fn().mockResolvedValue(undefined) };
    return {
      scheduleRepo,
      eventRepo,
      deleteEvent,
      svc: new DeleteShelterScheduleService(
        scheduleRepo as never,
        eventRepo as never,
        deleteEvent as never,
        {} as never,
      ),
    };
  }

  it("apaga os eventos da agenda e depois a agenda", async () => {
    const { svc, deleteEvent, scheduleRepo } = setup();
    await svc.execute("sch1");
    expect(deleteEvent.remove.mock.calls.map((c) => c[0])).toEqual([
      "e1",
      "e2",
    ]);
    expect(scheduleRepo.remove).toHaveBeenCalledWith("sch1");
  });

  it("falha ao apagar um evento: a agenda NÃO é removida (sem eventos órfãos)", async () => {
    const { svc, deleteEvent, scheduleRepo } = setup();
    deleteEvent.remove.mockRejectedValueOnce(new Error("s3"));
    await expect(svc.execute("sch1")).rejects.toThrow("s3");
    expect(scheduleRepo.remove).not.toHaveBeenCalled();
  });

  it("agenda inexistente: 404 sem tocar em eventos", async () => {
    const { svc, scheduleRepo, deleteEvent } = setup();
    scheduleRepo.findById.mockResolvedValue(null);
    await expect(svc.execute("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(deleteEvent.remove).not.toHaveBeenCalled();
  });
});

describe("ListShelterSchedulesService", () => {
  const req = (teamId?: string) =>
    ({ query: teamId ? { teamId } : {} }) as never;
  function setup(role?: string) {
    const repo = {
      findAll: jest
        .fn()
        .mockResolvedValue([{ team: { id: "t1" } }, { team: { id: "t2" } }]),
      findByLeaderId: jest.fn().mockResolvedValue([{ team: { id: "t1" } }]),
      findByMemberId: jest.fn().mockResolvedValue([{ team: { id: "t2" } }]),
    };
    const auth = {
      tryGetPayload: jest
        .fn()
        .mockResolvedValue(role ? { role, sub: "u1" } : null),
    };
    return {
      repo,
      svc: new ListShelterSchedulesService(repo as never, auth as never),
    };
  }

  it("visitante não vê nada", async () => {
    const { svc } = setup();
    await expect(svc.execute(req())).resolves.toEqual([]);
  });

  it("admin vê tudo, líder só as suas, membro só as da própria equipe", async () => {
    expect(await setup("admin").svc.execute(req())).toHaveLength(2);
    expect(await setup("leader").svc.execute(req())).toHaveLength(1);
    expect(await setup("member").svc.execute(req())).toHaveLength(1);
  });

  it("?teamId só estreita o que o papel já enxerga (membro não lê equipe alheia)", async () => {
    const { svc } = setup("member");
    await expect(svc.execute(req("t1"))).resolves.toEqual([]);
  });
});
