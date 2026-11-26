import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { In } from "typeorm";

import { UserEntity } from "src/core/user/entities/user.entity";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { VisitReportEntity } from "src/shelter/visit-report/entities/visit-report.entity";

import { AttendanceRepository } from "./attendance.repository";
import { AttendanceEntity } from "../entities/attendance.entity";
import { AttendanceRecordsFilters } from "../types";
import { ATTENDANCE_SORT_COLUMNS } from "../constants";
import {
  TODAY,
  buildAttendance,
  buildSchedule,
  buildTeam,
} from "../attendance.fixtures";

type WhereCall = [string, Record<string, unknown>?];

const createQueryBuilderMock = () => {
  const builder = {
    leftJoin: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  };
  for (const key of [
    "leftJoin",
    "leftJoinAndSelect",
    "where",
    "andWhere",
    "orderBy",
    "select",
    "skip",
    "take",
  ] as const) {
    builder[key].mockReturnValue(builder);
  }
  return builder;
};

const filters = (
  overrides: Partial<AttendanceRecordsFilters> = {},
): AttendanceRecordsFilters => ({
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "DESC",
  ...overrides,
});

describe("AttendanceRepository", () => {
  let qb: ReturnType<typeof createQueryBuilderMock>;
  let attendanceRepo: Record<string, jest.Mock>;
  let scheduleRepo: Record<string, jest.Mock>;
  let teamRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let visitReportRepo: Record<string, jest.Mock>;
  let repository: AttendanceRepository;

  it("uses only the transaction repository for the full batch and clears old comments", async () => {
    const existing = buildAttendance({ comment: "old" });
    const tx = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null),
      create: jest.fn(() => new AttendanceEntity()),
      save: jest.fn(async (entity: AttendanceEntity) => entity),
    };
    const getRepository = jest.fn(() => tx);
    const transaction = jest.fn(
      async (
        work: (manager: {
          getRepository: typeof getRepository;
        }) => Promise<AttendanceEntity[]>,
      ) => work({ getRepository }),
    );
    Object.assign(attendanceRepo, { manager: { transaction } });
    const sample = buildAttendance();
    const result = await repository.saveBatch([
      {
        member: sample.member,
        schedule: sample.shelterSchedule,
        category: sample.category,
        type: sample.type,
        comment: "",
      },
      {
        member: sample.member,
        schedule: sample.shelterSchedule,
        category: sample.category,
        type: sample.type,
      },
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(AttendanceEntity);
    expect(tx.save).toHaveBeenCalledTimes(2);
    expect(attendanceRepo.save).not.toHaveBeenCalled();
    expect(result[0].comment).toBe("");
  });

  it("propagates a batch failure to the transaction boundary", async () => {
    const failure = new Error("write failed");
    const tx = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(() => new AttendanceEntity()),
      save: jest.fn().mockRejectedValue(failure),
    };
    const getRepository = jest.fn(() => tx);
    const transaction = jest.fn(
      async (
        work: (manager: {
          getRepository: typeof getRepository;
        }) => Promise<AttendanceEntity[]>,
      ) => work({ getRepository }),
    );
    Object.assign(attendanceRepo, { manager: { transaction } });
    const sample = buildAttendance();
    await expect(
      repository.saveBatch([
        {
          member: sample.member,
          schedule: sample.shelterSchedule,
          category: sample.category,
          type: sample.type,
        },
      ]),
    ).rejects.toThrow(failure);
    expect(attendanceRepo.save).not.toHaveBeenCalled();
  });

  const clauses = (): WhereCall[] => [
    ...(qb.where.mock.calls as WhereCall[]),
    ...(qb.andWhere.mock.calls as WhereCall[]),
  ];
  const clauseMatching = (fragment: string): WhereCall | undefined =>
    clauses().find(([sql]) => sql.includes(fragment));

  beforeEach(async () => {
    jest.clearAllMocks();
    qb = createQueryBuilderMock();

    const repoFor = () => ({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      countBy: jest.fn().mockResolvedValue(0),
    });

    attendanceRepo = repoFor();
    scheduleRepo = repoFor();
    teamRepo = repoFor();
    userRepo = repoFor();
    visitReportRepo = repoFor();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceRepository,
        {
          provide: getRepositoryToken(AttendanceEntity),
          useValue: attendanceRepo,
        },
        {
          provide: getRepositoryToken(ShelterScheduleEntity),
          useValue: scheduleRepo,
        },
        { provide: getRepositoryToken(TeamEntity), useValue: teamRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        {
          provide: getRepositoryToken(VisitReportEntity),
          useValue: visitReportRepo,
        },
      ],
    }).compile();

    repository = moduleRef.get(AttendanceRepository);
  });

  describe("usuário e equipes", () => {
    it("carrega o usuário com os dois perfis", async () => {
      await repository.findUserWithMembership("user-id");

      const [options] = userRepo.findOne.mock.calls[0] as [
        { relations: string[] },
      ];
      expect(options.relations).toEqual(
        expect.arrayContaining(["leaderProfile.teams", "memberProfile.team"]),
      );
    });

    it("lista as equipes que o usuário lidera", async () => {
      qb.getRawMany.mockResolvedValue([{ teamId: "a" }, { teamId: "b" }]);

      await expect(repository.findLeaderTeamIds("user-id")).resolves.toEqual([
        "a",
        "b",
      ]);
      expect(qb.leftJoin).toHaveBeenCalledWith("team.leaders", "profile");
    });

    it("lista as equipes das quais é membro", async () => {
      await repository.findMemberTeamIds("user-id");

      expect(qb.leftJoin).toHaveBeenCalledWith("team.members", "profile");
    });

    it("busca todas as equipes quando não há filtro", async () => {
      await repository.findTeamsWithMembers();

      const [options] = teamRepo.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(options).not.toHaveProperty("where");
    });

    it("filtra pelas equipes informadas", async () => {
      await repository.findTeamsWithMembers(["a", "b"]);

      const [options] = teamRepo.find.mock.calls[0] as [
        { where: { id: unknown } },
      ];
      expect(options.where).toEqual({ id: In(["a", "b"]) });
    });
  });

  describe("findSchedulesForTeams", () => {
    it("não consulta nada sem equipe alguma", async () => {
      await expect(repository.findSchedulesForTeams([])).resolves.toEqual([]);
      expect(scheduleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("busca os agendamentos de várias equipes numa consulta só", async () => {
      await repository.findSchedulesForTeams(["a", "b", "c"]);

      expect(scheduleRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(clauseMatching("schedule.team.id IN")).toEqual([
        "schedule.team.id IN (:...teamIds)",
        { teamIds: ["a", "b", "c"] },
      ]);
    });

    it("recorta pelo que já aconteceu", async () => {
      await repository.findSchedulesForTeams(["a"], { before: TODAY });

      expect(clauseMatching("schedule.visitDate < :before")?.[1]).toEqual({
        before: "2026-09-10",
      });
    });

    it("recorta por período", async () => {
      await repository.findSchedulesForTeams(["a"], {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });

      expect(clauseMatching(">= :startDate")).toBeDefined();
      expect(clauseMatching("<= :endDate")).toBeDefined();
    });
  });

  describe("frequência", () => {
    it("não consulta nada sem agendamento algum", async () => {
      await expect(repository.findAttendancesForSchedules([])).resolves.toEqual(
        [],
      );
      expect(attendanceRepo.find).not.toHaveBeenCalled();
    });

    it("busca os registros de vários agendamentos numa consulta só", async () => {
      await repository.findAttendancesForSchedules(["s1", "s2"]);

      expect(attendanceRepo.find).toHaveBeenCalledTimes(1);
      const [options] = attendanceRepo.find.mock.calls[0] as [
        { where: { shelterSchedule: { id: unknown } } },
      ];
      expect(options.where.shelterSchedule.id).toEqual(In(["s1", "s2"]));
    });

    it("busca um registro por membro, encontro e categoria", async () => {
      await repository.findOneAttendance(
        "m1",
        "s1",
        buildAttendance().category,
      );

      const [options] = attendanceRepo.findOne.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(options.where).toMatchObject({
        member: { id: "m1" },
        shelterSchedule: { id: "s1" },
      });
    });

    it("create e save delegam ao TypeORM", async () => {
      const entity = buildAttendance();
      attendanceRepo.create.mockReturnValue(entity);
      attendanceRepo.save.mockResolvedValue(entity);

      repository.create({ type: entity.type });
      await repository.save(entity);

      expect(attendanceRepo.create).toHaveBeenCalledWith({ type: entity.type });
      expect(attendanceRepo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe("findRecordsPaginated", () => {
    it("pagina e ordena pelo campo mapeado", async () => {
      await repository.findRecordsPaginated(
        filters({ page: 3, limit: 10, sortBy: "visitDate", sortOrder: "ASC" }),
      );

      expect(qb.orderBy).toHaveBeenCalledWith(
        ATTENDANCE_SORT_COLUMNS.visitDate,
        "ASC",
      );
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it("restringe às equipes informadas", async () => {
      await repository.findRecordsPaginated(filters(), ["a"]);

      expect(clauseMatching("schedule.team.id IN")).toEqual([
        "schedule.team.id IN (:...teamIds)",
        { teamIds: ["a"] },
      ]);
    });

    it("sem lista de equipes, não restringe", async () => {
      await repository.findRecordsPaginated(filters());

      expect(clauseMatching("schedule.team.id IN")).toBeUndefined();
    });

    it.each([
      ["category", "attendance.category"],
      ["type", "attendance.type"],
      ["teamId", "schedule.team.id"],
      ["memberId", "attendance.member.id"],
      ["scheduleId", "schedule.id"],
    ])("aplica o filtro %s", async (key, fragment) => {
      await repository.findRecordsPaginated(
        filters({ [key]: "valor" } as Partial<AttendanceRecordsFilters>),
      );

      expect(clauseMatching(fragment)).toBeDefined();
    });

    it("busca o nome do membro sem diferenciar maiúsculas", async () => {
      await repository.findRecordsPaginated(filters({ memberName: "ana" }));

      expect(clauseMatching("LOWER(member.name)")?.[1]).toEqual({
        memberName: "%ana%",
      });
    });

    it("devolve itens e total", async () => {
      qb.getManyAndCount.mockResolvedValue([[buildAttendance()], 42]);

      await expect(repository.findRecordsPaginated(filters())).resolves.toEqual(
        {
          items: [expect.objectContaining({ id: "attendance-id" })],
          total: 42,
        },
      );
    });
  });

  describe("estatísticas", () => {
    it("busca os registros do próprio membro", async () => {
      await repository.findRecordsOfMember("m1", { teamId: "t1" });

      expect(clauseMatching("attendance.member.id = :memberId")).toBeDefined();
      expect(clauseMatching("schedule.team.id = :teamId")).toBeDefined();
    });

    it("não consulta nada sem membro algum", async () => {
      await expect(
        repository.findRecordsOfMembers([], "t1", {}),
      ).resolves.toEqual([]);
    });

    it("busca os registros de vários membros de uma equipe", async () => {
      await repository.findRecordsOfMembers(["a", "b"], "t1", {});

      expect(clauseMatching("attendance.member.id IN")?.[1]).toEqual({
        memberIds: ["a", "b"],
      });
    });

    it("conta os encontros da equipe no período", async () => {
      qb.getCount.mockResolvedValue(7);

      await expect(
        repository.countSchedulesOfTeam("t1", { startDate: "2026-01-01" }),
      ).resolves.toBe(7);
      expect(clauseMatching(">= :startDate")).toBeDefined();
    });

    it("busca os encontros passados do usuário, como líder ou membro", async () => {
      await repository.findPastSchedulesOfUser("u1", {}, TODAY);

      expect(
        clauseMatching("leaderUser.id = :userId OR memberUser.id = :userId"),
      ).toBeDefined();
    });
  });

  describe("findScheduleIdsWithReport", () => {
    it("devolve conjunto vazio sem agendamento algum", async () => {
      const result = await repository.findScheduleIdsWithReport([]);

      expect(result.size).toBe(0);
      expect(visitReportRepo.find).not.toHaveBeenCalled();
    });

    it("devolve os ids que já têm relatório", async () => {
      visitReportRepo.find.mockResolvedValue([
        { schedule: buildSchedule({ id: "s1" }) },
        { schedule: buildSchedule({ id: "s2" }) },
      ]);

      const result = await repository.findScheduleIdsWithReport([
        "s1",
        "s2",
        "s3",
      ]);

      expect([...result].sort()).toEqual(["s1", "s2"]);
    });
  });

  it("findTeamWithMembers carrega abrigo e membros", async () => {
    teamRepo.findOne.mockResolvedValue(buildTeam());

    await repository.findTeamWithMembers("t1");

    const [options] = teamRepo.findOne.mock.calls[0] as [
      { relations: string[] },
    ];
    expect(options.relations).toEqual(
      expect.arrayContaining(["shelter", "members", "members.user"]),
    );
  });
});
