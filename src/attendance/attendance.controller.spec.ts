import { Test } from "@nestjs/testing";
import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";

import { AttendanceController } from "./attendance.controller";
import { GetPendingsService } from "./services/get-pendings.service";
import { GetRecordsService } from "./services/get-records.service";
import { GetSchedulesService } from "./services/get-schedules.service";
import { GetStatsService } from "./services/get-stats.service";
import { GetTeamsService } from "./services/get-teams.service";
import { RegisterAttendanceService } from "./services/register-attendance.service";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";
import {
  AttendanceCategory,
  AttendanceType,
} from "./entities/attendance.entity";

describe("AttendanceController", () => {
  const registerService = { registerOwn: jest.fn(), registerTeam: jest.fn() };
  const pendingsService = { execute: jest.fn() };
  const teamsService = {
    listTeamMembers: jest.fn(),
    listLeaderTeams: jest.fn(),
    listLeaderTeamsWithMembers: jest.fn(),
  };
  const schedulesService = {
    listTeamSchedules: jest.fn(),
    listSheetsHierarchical: jest.fn(),
  };
  const recordsService = { execute: jest.fn() };
  const statsService = { forMember: jest.fn(), forTeam: jest.fn() };

  const request = {
    user: { userId: "leader-user-id", role: UserRole.LEADER },
  } as AuthenticatedRequest;
  const actor = { userId: "leader-user-id", role: UserRole.LEADER };
  const teamId = "3f1a1d7e-0000-4000-8000-000000000001";

  let controller: AttendanceController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        { provide: RegisterAttendanceService, useValue: registerService },
        { provide: GetPendingsService, useValue: pendingsService },
        { provide: GetTeamsService, useValue: teamsService },
        { provide: GetSchedulesService, useValue: schedulesService },
        { provide: GetRecordsService, useValue: recordsService },
        { provide: GetStatsService, useValue: statsService },
      ],
    }).compile();

    controller = moduleRef.get(AttendanceController);

    registerService.registerOwn.mockResolvedValue({ id: "a" });
    registerService.registerTeam.mockResolvedValue([{ id: "a" }]);
    pendingsService.execute.mockResolvedValue({
      leaderPendings: [],
      memberPendings: [],
      visitReportPendings: [],
    });
    teamsService.listTeamMembers.mockResolvedValue({ members: [] });
    teamsService.listLeaderTeams.mockResolvedValue([]);
    teamsService.listLeaderTeamsWithMembers.mockResolvedValue([]);
    schedulesService.listTeamSchedules.mockResolvedValue([]);
    schedulesService.listSheetsHierarchical.mockResolvedValue([]);
    recordsService.execute.mockResolvedValue({ data: [], meta: {} });
    statsService.forMember.mockResolvedValue({ totalEvents: 0 });
    statsService.forTeam.mockResolvedValue({ totalEvents: 0 });
  });

  it("resolve o ator do token e repassa o registro individual", async () => {
    const dto = {
      scheduleId: "s1",
      type: AttendanceType.PRESENT,
      category: AttendanceCategory.VISIT,
    };

    await controller.registerAttendance(request, dto);

    expect(registerService.registerOwn).toHaveBeenCalledWith(actor, dto);
  });

  it("repassa o registro em lote", async () => {
    const dto = {
      teamId,
      scheduleId: "s1",
      attendances: [{ memberId: "m1", type: AttendanceType.PRESENT }],
    };

    await controller.registerTeamAttendance(request, dto);

    expect(registerService.registerTeam).toHaveBeenCalledWith(actor, dto);
  });

  it("as pendências são calculadas na data de hoje", async () => {
    await controller.getAllPendings(request);

    const [passedActor, date] = pendingsService.execute.mock.calls[0] as [
      unknown,
      Date,
    ];
    expect(passedActor).toEqual(actor);
    expect(date).toBeInstanceOf(Date);
  });

  it("repassa id de equipe e período nas consultas de equipe", async () => {
    const period = { startDate: "2026-01-01", endDate: "2026-12-31" };

    await controller.listTeamMembers(request, teamId);
    await controller.listTeamSchedules(request, teamId, period);
    await controller.getTeamAttendanceStats(request, teamId, period);

    expect(teamsService.listTeamMembers).toHaveBeenCalledWith(actor, teamId);
    expect(schedulesService.listTeamSchedules).toHaveBeenCalledWith(
      actor,
      teamId,
      period,
    );
    expect(statsService.forTeam).toHaveBeenCalledWith(actor, teamId, period);
  });

  it("repassa as listagens do líder", async () => {
    await controller.listLeaderTeams(request);
    await controller.listLeaderTeamsWithMembers(request);
    await controller.listSheetsHierarchical(request, {});

    expect(teamsService.listLeaderTeams).toHaveBeenCalledWith(actor);
    expect(teamsService.listLeaderTeamsWithMembers).toHaveBeenCalledWith(actor);
    expect(schedulesService.listSheetsHierarchical).toHaveBeenCalledWith(
      actor,
      {},
    );
  });

  it("repassa os filtros da listagem de registros", async () => {
    const filters = Object.assign(new AttendanceFiltersDto(), {
      page: 2,
      category: AttendanceCategory.MEETING,
    });

    await controller.listAttendanceRecords(request, filters);

    expect(recordsService.execute).toHaveBeenCalledWith(actor, filters);
  });

  it("as estatísticas pessoais recortam só o período e a equipe", async () => {
    const filters = Object.assign(new AttendanceFiltersDto(), {
      teamId,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      memberName: "ignorado",
    });

    await controller.getAttendanceStats(request, filters);

    expect(statsService.forMember).toHaveBeenCalledWith(actor, {
      teamId,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
  });

  it("recusa requisição sem usuário no token, antes de chamar o caso de uso", () => {
    const anonymous = {} as AuthenticatedRequest;

    // O ator é resolvido de forma síncrona: nem chega a virar promessa.
    expect(() => controller.getAllPendings(anonymous)).toThrow(
      UnauthenticatedException,
    );
    expect(pendingsService.execute).not.toHaveBeenCalled();
  });
});
