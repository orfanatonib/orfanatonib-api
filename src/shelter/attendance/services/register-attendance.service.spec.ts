import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { RegisterAttendanceService } from "./register-attendance.service";
import {
  AttendanceCategory,
  AttendanceEntity,
  AttendanceType,
} from "../entities/attendance.entity";
import { ATTENDANCE_MESSAGES } from "../constants";
import {
  buildActor,
  buildAttendance,
  buildMemberProfile,
  buildSchedule,
  buildTeam,
  buildUser,
} from "../attendance.fixtures";

describe("RegisterAttendanceService", () => {
  const repository = {
    findScheduleWithTeam: jest.fn(),
    findTeamWithMembers: jest.fn(),
    findOneAttendance: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    saveBatch: jest.fn(),
  };
  const scopeService = {
    resolve: jest.fn(),
    assertLeads: jest.fn(),
    assertBelongs: jest.fn(),
  };

  let service: RegisterAttendanceService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegisterAttendanceService,
        { provide: AttendanceRepository, useValue: repository },
        { provide: AttendanceScopeService, useValue: scopeService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(RegisterAttendanceService);

    scopeService.resolve.mockResolvedValue({
      actor: buildActor(),
      user: buildUser(),
      isAdmin: false,
      leaderTeamIds: ["team-id"],
      memberTeamIds: [],
    });
    repository.findScheduleWithTeam.mockResolvedValue(buildSchedule());
    repository.findTeamWithMembers.mockResolvedValue(buildTeam());
    repository.findOneAttendance.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<AttendanceEntity>) =>
      Object.assign(new AttendanceEntity(), data),
    );
    repository.saveBatch.mockImplementation(
      (entries: import("../types").AttendanceBatchEntry[]) =>
        Promise.resolve(
          entries.map((entry) =>
            Object.assign(buildAttendance(), {
              member: entry.member,
              shelterSchedule: entry.schedule,
              category: entry.category,
              type: entry.type,
              comment: entry.comment,
            }),
          ),
        ),
    );
    repository.save.mockImplementation((entity: AttendanceEntity) =>
      Promise.resolve(Object.assign(buildAttendance(), entity)),
    );
  });

  describe("registerOwn", () => {
    const dto = {
      scheduleId: "schedule-id",
      type: AttendanceType.PRESENT,
      comment: "cheguei atrasado",
    };

    it("grava a presença do próprio usuário", async () => {
      const result = await service.registerOwn(buildActor(), dto);

      expect(scopeService.assertBelongs).toHaveBeenCalledWith(
        expect.any(Object),
        "team-id",
      );
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result.memberName).toBe("Maria Souza");
    });

    it("assume a categoria visita quando não informada", async () => {
      await service.registerOwn(buildActor(), dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: AttendanceCategory.VISIT }),
      );
    });

    it("corrige o lançamento existente em vez de duplicar", async () => {
      const existing = buildAttendance({ type: AttendanceType.ABSENT });
      repository.findOneAttendance.mockResolvedValue(existing);

      await service.registerOwn(buildActor(), dto);

      expect(repository.create).not.toHaveBeenCalled();
      expect(existing.type).toBe(AttendanceType.PRESENT);
      expect(existing.comment).toBe("cheguei atrasado");
    });

    it("recusa agendamento inexistente", async () => {
      repository.findScheduleWithTeam.mockResolvedValue(null);

      await expect(service.registerOwn(buildActor(), dto)).rejects.toThrow(
        new ResourceNotFoundException(ATTENDANCE_MESSAGES.SCHEDULE_NOT_FOUND),
      );
    });

    it("recusa agendamento sem data de visita nem de reunião", async () => {
      repository.findScheduleWithTeam.mockResolvedValue(
        buildSchedule({ visitDate: undefined, meetingDate: undefined }),
      );

      await expect(service.registerOwn(buildActor(), dto)).rejects.toThrow(
        new RuleException(ATTENDANCE_MESSAGES.SCHEDULE_WITHOUT_DATE),
      );
    });

    it("recusa quem não pertence à equipe do encontro", async () => {
      scopeService.assertBelongs.mockImplementation(() => {
        throw new AccessDeniedException(ATTENDANCE_MESSAGES.NOT_TEAM_MEMBER);
      });

      await expect(service.registerOwn(buildActor(), dto)).rejects.toThrow(
        AccessDeniedException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe("registerTeam", () => {
    const dto = {
      teamId: "team-id",
      scheduleId: "schedule-id",
      category: AttendanceCategory.MEETING,
      attendances: [
        { memberId: "member-user-id", type: AttendanceType.PRESENT },
      ],
    };

    it("grava a frequência de cada membro informado", async () => {
      const result = await service.registerTeam(buildActor(), dto);

      expect(scopeService.assertLeads).toHaveBeenCalledWith(
        expect.any(Object),
        "team-id",
      );
      expect(result).toHaveLength(1);
      expect(repository.saveBatch).toHaveBeenCalledWith([
        expect.objectContaining({ category: AttendanceCategory.MEETING }),
      ]);
    });

    it("recusa membro que não é da equipe", async () => {
      await expect(
        service.registerTeam(buildActor(), {
          ...dto,
          attendances: [{ memberId: "estranho", type: AttendanceType.PRESENT }],
        }),
      ).rejects.toThrow(
        new RuleException(ATTENDANCE_MESSAGES.MEMBER_NOT_IN_TEAM("estranho")),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("does not persist an earlier valid entry when a later member is invalid", async () => {
      await expect(
        service.registerTeam(buildActor(), {
          ...dto,
          attendances: [
            { memberId: "member-user-id", type: AttendanceType.PRESENT },
            { memberId: "outside-team", type: AttendanceType.ABSENT },
          ],
        }),
      ).rejects.toThrow(RuleException);
      expect(repository.saveBatch).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("recusa encontro que pertence a outra equipe", async () => {
      repository.findScheduleWithTeam.mockResolvedValue(
        buildSchedule({ team: buildTeam({ id: "outra-equipe" }) }),
      );

      await expect(service.registerTeam(buildActor(), dto)).rejects.toThrow(
        new AccessDeniedException(ATTENDANCE_MESSAGES.SCHEDULE_OTHER_TEAM),
      );
    });

    it("recusa equipe inexistente", async () => {
      repository.findTeamWithMembers.mockResolvedValue(null);

      await expect(service.registerTeam(buildActor(), dto)).rejects.toThrow(
        new ResourceNotFoundException(ATTENDANCE_MESSAGES.TEAM_NOT_FOUND),
      );
    });

    it("recusa quem não lidera a equipe, antes de tocar no banco", async () => {
      scopeService.assertLeads.mockImplementation(() => {
        throw new AccessDeniedException(ATTENDANCE_MESSAGES.NOT_TEAM_LEADER);
      });

      await expect(service.registerTeam(buildActor(), dto)).rejects.toThrow(
        AccessDeniedException,
      );
      expect(repository.findScheduleWithTeam).not.toHaveBeenCalled();
    });

    it("grava vários membros numa chamada só", async () => {
      repository.findTeamWithMembers.mockResolvedValue(
        buildTeam({
          members: [
            buildMemberProfile(buildUser({ id: "a" })),
            buildMemberProfile(buildUser({ id: "b" })),
          ],
        }),
      );

      const result = await service.registerTeam(buildActor(), {
        ...dto,
        attendances: [
          { memberId: "a", type: AttendanceType.PRESENT },
          { memberId: "b", type: AttendanceType.ABSENT, comment: "doente" },
        ],
      });

      expect(result).toHaveLength(2);
      expect(repository.saveBatch).toHaveBeenCalledTimes(1);
      expect(repository.saveBatch.mock.calls[0][0]).toHaveLength(2);
    });
  });
});
