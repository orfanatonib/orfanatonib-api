import { Test } from "@nestjs/testing";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { GetPendingsService } from "./get-pendings.service";
import {
  AttendanceCategory,
  AttendanceType,
} from "../entities/attendance.entity";
import {
  TODAY,
  buildActor,
  buildAdminActor,
  buildAttendance,
  buildMemberProfile,
  buildSchedule,
  buildTeam,
  buildUser,
} from "../attendance.fixtures";

const memberA = buildUser({ id: "user-a", name: "Ana" });
const memberB = buildUser({ id: "user-b", name: "Bruno" });

const teamWith = (...users: ReturnType<typeof buildUser>[]) =>
  buildTeam({ members: users.map(buildMemberProfile) });

describe("GetPendingsService", () => {
  const repository = {
    findTeamsWithMembers: jest.fn(),
    findSchedulesForTeams: jest.fn(),
    findAttendancesForSchedules: jest.fn(),
    findScheduleIdsWithReport: jest.fn(),
  };
  const scopeService = {
    resolve: jest.fn(),
    leaderTeamFilter: jest.fn(),
  };

  let service: GetPendingsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetPendingsService,
        { provide: AttendanceRepository, useValue: repository },
        { provide: AttendanceScopeService, useValue: scopeService },
      ],
    }).compile();

    service = moduleRef.get(GetPendingsService);

    scopeService.resolve.mockResolvedValue({
      actor: buildActor(),
      user: buildUser(),
      isAdmin: false,
      leaderTeamIds: ["team-id"],
      memberTeamIds: [],
    });
    scopeService.leaderTeamFilter.mockReturnValue(["team-id"]);

    repository.findTeamsWithMembers.mockResolvedValue([
      teamWith(memberA, memberB),
    ]);
    repository.findSchedulesForTeams.mockResolvedValue([
      buildSchedule({ meetingDate: undefined }),
    ]);
    repository.findAttendancesForSchedules.mockResolvedValue([]);
    repository.findScheduleIdsWithReport.mockResolvedValue(
      new Set(["schedule-id"]),
    );
  });

  describe("pendências do líder", () => {
    it("lista quem ainda não teve frequência lançada", async () => {
      const result = await service.execute(buildActor(), TODAY);

      expect(result.leaderPendings).toHaveLength(1);
      const [pending] = result.leaderPendings[0].pendings;
      expect(pending.pendingMembers.map((m) => m.memberId).sort()).toEqual([
        "user-a",
        "user-b",
      ]);
      expect(pending.totalMembers).toBe(2);
    });

    it("some da lista quando todos já foram lançados", async () => {
      repository.findAttendancesForSchedules.mockResolvedValue([
        buildAttendance({ member: memberA }),
        buildAttendance({ id: "att-b", member: memberB }),
      ]);

      const result = await service.execute(buildActor(), TODAY);

      expect(result.leaderPendings).toEqual([]);
    });

    it("conta visita e reunião como pendências separadas", async () => {
      repository.findSchedulesForTeams.mockResolvedValue([buildSchedule()]);
      repository.findAttendancesForSchedules.mockResolvedValue([
        buildAttendance({
          member: memberA,
          category: AttendanceCategory.VISIT,
        }),
        buildAttendance({
          id: "b",
          member: memberB,
          category: AttendanceCategory.VISIT,
        }),
      ]);

      const result = await service.execute(buildActor(), TODAY);

      // A visita está completa; a reunião, não.
      const categorias = result.leaderPendings[0].pendings.map(
        (p) => p.category,
      );
      expect(categorias).toEqual([AttendanceCategory.MEETING]);
    });

    it("ignora encontro que ainda não aconteceu", async () => {
      repository.findSchedulesForTeams.mockResolvedValue([
        buildSchedule({ visitDate: "2027-01-01", meetingDate: undefined }),
      ]);

      const result = await service.execute(buildActor(), TODAY);

      expect(result.leaderPendings).toEqual([]);
    });
  });

  describe("pendências do próprio usuário", () => {
    beforeEach(() => {
      scopeService.resolve.mockResolvedValue({
        actor: buildActor({ userId: "user-a" }),
        user: buildUser(),
        isAdmin: false,
        leaderTeamIds: [],
        memberTeamIds: ["team-id"],
      });
      scopeService.leaderTeamFilter.mockReturnValue([]);
      repository.findTeamsWithMembers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([teamWith(memberA)]);
    });

    it("lista o encontro sem lançamento para ele", async () => {
      const result = await service.execute(
        buildActor({ userId: "user-a" }),
        TODAY,
      );

      expect(result.memberPendings).toHaveLength(1);
      expect(result.memberPendings[0].scheduleId).toBe("schedule-id");
    });

    it("some quando o líder já lançou a dele", async () => {
      repository.findAttendancesForSchedules.mockResolvedValue([
        buildAttendance({ member: memberA, type: AttendanceType.ABSENT }),
      ]);

      const result = await service.execute(
        buildActor({ userId: "user-a" }),
        TODAY,
      );

      expect(result.memberPendings).toEqual([]);
    });

    it("admin não tem pendência pessoal", async () => {
      scopeService.resolve.mockResolvedValue({
        actor: buildAdminActor(),
        user: buildUser(),
        isAdmin: true,
        leaderTeamIds: [],
        memberTeamIds: [],
      });
      scopeService.leaderTeamFilter.mockReturnValue(undefined);
      repository.findTeamsWithMembers.mockReset();
      repository.findTeamsWithMembers.mockResolvedValue([teamWith(memberA)]);

      const result = await service.execute(buildAdminActor(), TODAY);

      expect(result.memberPendings).toEqual([]);
    });
  });

  describe("relatórios de visita pendentes", () => {
    it("lista a visita passada sem relatório", async () => {
      repository.findScheduleIdsWithReport.mockResolvedValue(new Set());

      const result = await service.execute(buildActor(), TODAY);

      expect(result.visitReportPendings).toHaveLength(1);
      const [pending] = result.visitReportPendings[0].pendings;
      expect(pending.scheduleId).toBe("schedule-id");
      expect(pending.visitDateFormatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(pending.summary).toContain("Rodada 3");
      expect(pending.shelterAddress).toContain("Manaus");
    });

    it("some quando o relatório já existe", async () => {
      const result = await service.execute(buildActor(), TODAY);

      expect(result.visitReportPendings).toEqual([]);
    });

    it("reunião não gera pendência de relatório", async () => {
      repository.findSchedulesForTeams.mockResolvedValue([
        buildSchedule({ visitDate: undefined }),
      ]);
      repository.findScheduleIdsWithReport.mockResolvedValue(new Set());

      const result = await service.execute(buildActor(), TODAY);

      expect(result.visitReportPendings).toEqual([]);
    });
  });

  it("consulta o banco um número fixo de vezes, não por equipe", async () => {
    repository.findTeamsWithMembers.mockResolvedValue([
      teamWith(memberA),
      buildTeam({ id: "team-2", members: [buildMemberProfile(memberB)] }),
      buildTeam({ id: "team-3", members: [buildMemberProfile(memberA)] }),
    ]);

    await service.execute(buildActor(), TODAY);

    // Antes era uma consulta de agendamentos por equipe e duas de frequência
    // por agendamento; agora é uma de cada, qualquer que seja o número de times.
    expect(repository.findSchedulesForTeams).toHaveBeenCalledTimes(1);
    expect(repository.findAttendancesForSchedules).toHaveBeenCalledTimes(1);
    expect(repository.findScheduleIdsWithReport).toHaveBeenCalledTimes(1);
  });
});
