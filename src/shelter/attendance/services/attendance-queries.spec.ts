import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { GetTeamsService } from "./get-teams.service";
import { GetSchedulesService } from "./get-schedules.service";
import { GetRecordsService } from "./get-records.service";
import { GetStatsService } from "./get-stats.service";
import { AttendanceFiltersDto } from "../dto/attendance-filters.dto";
import {
  AttendanceCategory,
  AttendanceType,
} from "../entities/attendance.entity";
import {
  buildActor,
  buildAttendance,
  buildMemberProfile,
  buildSchedule,
  buildTeam,
  buildUser,
} from "../attendance.fixtures";

const repository = {
  findTeamsWithMembers: jest.fn(),
  findTeamWithMembers: jest.fn(),
  findSchedulesForTeams: jest.fn(),
  findAttendancesForSchedules: jest.fn(),
  findRecordsPaginated: jest.fn(),
  findRecordsOfMember: jest.fn(),
  findRecordsOfMembers: jest.fn(),
  findPastSchedulesOfUser: jest.fn(),
  countSchedulesOfTeam: jest.fn(),
};
const scopeService = {
  resolve: jest.fn(),
  assertLeads: jest.fn(),
  assertBelongs: jest.fn(),
  leaderTeamFilter: jest.fn(),
  allTeamFilter: jest.fn(),
};

const build = async <T>(token: new (...args: never[]) => T): Promise<T> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      token,
      { provide: AttendanceRepository, useValue: repository },
      { provide: AttendanceScopeService, useValue: scopeService },
    ],
  }).compile();
  return moduleRef.get(token);
};

beforeEach(() => {
  // `clearAllMocks` zera as chamadas mas mantém as implementações: um teste que
  // faz `assertLeads` lançar contaminaria os seguintes.
  jest.resetAllMocks();
  scopeService.resolve.mockResolvedValue({
    actor: buildActor(),
    user: buildUser(),
    isAdmin: false,
    leaderTeamIds: ["team-id"],
    memberTeamIds: [],
  });
  scopeService.leaderTeamFilter.mockReturnValue(["team-id"]);
  scopeService.allTeamFilter.mockReturnValue(["team-id"]);
  repository.findTeamsWithMembers.mockResolvedValue([buildTeam()]);
  repository.findTeamWithMembers.mockResolvedValue(buildTeam());
  repository.findSchedulesForTeams.mockResolvedValue([buildSchedule()]);
  repository.findAttendancesForSchedules.mockResolvedValue([]);
  repository.findRecordsPaginated.mockResolvedValue({ items: [], total: 0 });
  repository.findRecordsOfMember.mockResolvedValue([]);
  repository.findRecordsOfMembers.mockResolvedValue([]);
  repository.findPastSchedulesOfUser.mockResolvedValue([]);
  repository.countSchedulesOfTeam.mockResolvedValue(0);
});

describe("GetTeamsService", () => {
  it("lista os membros da equipe, exigindo liderança", async () => {
    const service = await build(GetTeamsService);

    const result = await service.listTeamMembers(buildActor(), "team-id");

    expect(scopeService.assertLeads).toHaveBeenCalledWith(
      expect.any(Object),
      "team-id",
    );
    expect(result.members).toHaveLength(1);
    expect(result.shelterName).toBe("Abrigo Esperança");
  });

  it("reporta 404 para equipe inexistente", async () => {
    repository.findTeamWithMembers.mockResolvedValue(null);
    const service = await build(GetTeamsService);

    await expect(
      service.listTeamMembers(buildActor(), "team-id"),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it("propaga a negativa de acesso", async () => {
    scopeService.assertLeads.mockImplementation(() => {
      throw new AccessDeniedException("negado");
    });
    const service = await build(GetTeamsService);

    await expect(
      service.listTeamMembers(buildActor(), "outra"),
    ).rejects.toThrow(AccessDeniedException);
  });

  it("devolve lista vazia para líder sem equipe", async () => {
    scopeService.leaderTeamFilter.mockReturnValue([]);
    const service = await build(GetTeamsService);

    await expect(service.listLeaderTeams(buildActor())).resolves.toEqual([]);
    expect(repository.findTeamsWithMembers).not.toHaveBeenCalled();
  });

  it("agrupa as equipes por abrigo, com os membros", async () => {
    repository.findTeamsWithMembers.mockResolvedValue([
      buildTeam({ id: "t1", numberTeam: 1 }),
      buildTeam({ id: "t2", numberTeam: 2 }),
    ]);
    const service = await build(GetTeamsService);

    const result = await service.listLeaderTeamsWithMembers(buildActor());

    expect(result).toHaveLength(1);
    expect(result[0].teams.map((t) => t.teamId)).toEqual(["t1", "t2"]);
    expect(result[0].teams[0].members).toHaveLength(1);
  });
});

describe("GetSchedulesService", () => {
  it("filters visit and meeting dates independently in both endpoints", async () => {
    repository.findSchedulesForTeams.mockResolvedValue([
      buildSchedule({ visitDate: "2026-11-01", meetingDate: "2026-10-30" }),
    ]);
    const service = await build(GetSchedulesService);
    const period = { startDate: "2026-11-01", endDate: "2026-11-30" };
    const schedules = await service.listTeamSchedules(
      buildActor(),
      "team-id",
      period,
    );
    expect(schedules.map((item) => item.category)).toEqual([
      AttendanceCategory.VISIT,
    ]);
    const sheets = await service.listSheetsHierarchical(buildActor(), period);
    expect(sheets[0].teams[0].schedules.map((item) => item.category)).toEqual([
      AttendanceCategory.VISIT,
    ]);
  });
  it("expande um agendamento em visita e reunião", async () => {
    const service = await build(GetSchedulesService);

    const result = await service.listTeamSchedules(buildActor(), "team-id");

    // Ordenado por data: a reunião (02/09) vem antes da visita (01/09).
    expect(result.map((s) => s.category)).toEqual([
      AttendanceCategory.MEETING,
      AttendanceCategory.VISIT,
    ]);
    expect(scopeService.assertBelongs).toHaveBeenCalled();
  });

  it("conta os lançamentos de cada encontro separadamente", async () => {
    repository.findAttendancesForSchedules.mockResolvedValue([
      buildAttendance({ category: AttendanceCategory.VISIT }),
    ]);
    const service = await build(GetSchedulesService);

    const result = await service.listTeamSchedules(buildActor(), "team-id");
    const visit = result.find((s) => s.category === AttendanceCategory.VISIT)!;
    const meeting = result.find(
      (s) => s.category === AttendanceCategory.MEETING,
    )!;

    expect(visit.attendanceCount).toBe(1);
    expect(meeting.attendanceCount).toBe(0);
    expect(visit.totalMembers).toBe(1);
  });

  it("devolve vazio quando a equipe não existe", async () => {
    repository.findTeamWithMembers.mockResolvedValue(null);
    const service = await build(GetSchedulesService);

    await expect(
      service.listTeamSchedules(buildActor(), "team-id"),
    ).resolves.toEqual([]);
  });

  it("monta a árvore abrigo → equipe → encontro", async () => {
    const service = await build(GetSchedulesService);

    const result = await service.listSheetsHierarchical(buildActor());

    expect(result).toHaveLength(1);
    expect(result[0].totalTeams).toBe(1);
    expect(result[0].teams[0].schedules).toHaveLength(2);
  });

  it("conta presentes, ausentes e pendentes por encontro", async () => {
    const team = buildTeam({
      members: [
        buildMemberProfile(buildUser({ id: "a" })),
        buildMemberProfile(buildUser({ id: "b" })),
        buildMemberProfile(buildUser({ id: "c" })),
      ],
    });
    repository.findTeamsWithMembers.mockResolvedValue([team]);
    repository.findAttendancesForSchedules.mockResolvedValue([
      buildAttendance({
        member: buildUser({ id: "a" }),
        type: AttendanceType.PRESENT,
      }),
      buildAttendance({
        id: "x",
        member: buildUser({ id: "b" }),
        type: AttendanceType.ABSENT,
      }),
    ]);
    const service = await build(GetSchedulesService);

    const result = await service.listSheetsHierarchical(buildActor());
    const visit = result[0].teams[0].schedules.find(
      (s) => s.category === AttendanceCategory.VISIT,
    );

    expect(visit).toMatchObject({
      totalMembers: 3,
      presentCount: 1,
      absentCount: 1,
      pendingCount: 1,
    });
  });

  it("líder sem equipe recebe árvore vazia", async () => {
    scopeService.leaderTeamFilter.mockReturnValue([]);
    const service = await build(GetSchedulesService);

    await expect(service.listSheetsHierarchical(buildActor())).resolves.toEqual(
      [],
    );
  });
});

describe("GetRecordsService", () => {
  const query = (overrides: Partial<AttendanceFiltersDto> = {}) =>
    Object.assign(new AttendanceFiltersDto(), overrides);

  it("devolve o envelope paginado que a tela consome", async () => {
    repository.findRecordsPaginated.mockResolvedValue({
      items: [buildAttendance()],
      total: 25,
    });
    const service = await build(GetRecordsService);

    const result = await service.execute(
      buildActor(),
      query({ page: 2, limit: 10 }),
    );

    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
    expect(result.data[0].memberName).toBe("Maria Souza");
  });

  it("restringe às equipes do ator", async () => {
    const service = await build(GetRecordsService);

    await service.execute(buildActor(), query());

    expect(repository.findRecordsPaginated).toHaveBeenCalledWith(
      expect.any(Object),
      ["team-id"],
    );
  });

  it("não consulta o banco quando o ator não tem equipe", async () => {
    scopeService.allTeamFilter.mockReturnValue([]);
    const service = await build(GetRecordsService);

    const result = await service.execute(buildActor(), query());

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(repository.findRecordsPaginated).not.toHaveBeenCalled();
  });

  it("admin não recebe filtro de equipe", async () => {
    scopeService.allTeamFilter.mockReturnValue(undefined);
    const service = await build(GetRecordsService);

    await service.execute(buildActor(), query());

    expect(repository.findRecordsPaginated).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
    );
  });
});

describe("GetStatsService", () => {
  it("calcula a taxa de presença do próprio usuário", async () => {
    repository.findRecordsOfMember.mockResolvedValue([
      buildAttendance({ type: AttendanceType.PRESENT }),
      buildAttendance({ id: "b", type: AttendanceType.PRESENT }),
      buildAttendance({ id: "c", type: AttendanceType.ABSENT }),
    ]);
    repository.findPastSchedulesOfUser.mockResolvedValue([
      buildSchedule(),
      buildSchedule({ id: "s2" }),
      buildSchedule({ id: "s3" }),
      buildSchedule({ id: "s4" }),
    ]);
    const service = await build(GetStatsService);

    await expect(service.forMember(buildActor(), {})).resolves.toEqual({
      totalEvents: 1,
      totalAttendanceRecords: 3,
      presentCount: 2,
      absentCount: 1,
      attendanceRate: 67,
      pendingCount: 1,
    });
  });

  it("sem registro algum, a taxa é zero e não divide por zero", async () => {
    const service = await build(GetStatsService);

    await expect(service.forMember(buildActor(), {})).resolves.toMatchObject({
      attendanceRate: 0,
      pendingCount: 0,
    });
  });

  it("a taxa da equipe mede cobertura do esperado", async () => {
    repository.findTeamWithMembers.mockResolvedValue(
      buildTeam({
        members: [
          buildMemberProfile(buildUser({ id: "a" })),
          buildMemberProfile(buildUser({ id: "b" })),
        ],
      }),
    );
    repository.countSchedulesOfTeam.mockResolvedValue(5);
    repository.findRecordsOfMembers.mockResolvedValue([
      buildAttendance({ type: AttendanceType.PRESENT }),
      buildAttendance({ id: "b", type: AttendanceType.ABSENT }),
    ]);
    const service = await build(GetStatsService);

    // 5 encontros x 2 membros = 10 esperados; 2 lançados.
    await expect(
      service.forTeam(buildActor(), "team-id", {}),
    ).resolves.toMatchObject({
      attendanceRate: 20,
      pendingCount: 8,
      totalEvents: 5,
    });
  });

  it("estatística de equipe exige liderança", async () => {
    scopeService.assertLeads.mockImplementation(() => {
      throw new AccessDeniedException("negado");
    });
    const service = await build(GetStatsService);

    await expect(service.forTeam(buildActor(), "team-id", {})).rejects.toThrow(
      AccessDeniedException,
    );
  });

  it("reporta 404 para equipe inexistente", async () => {
    repository.findTeamWithMembers.mockResolvedValue(null);
    const service = await build(GetStatsService);

    await expect(service.forTeam(buildActor(), "team-id", {})).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
