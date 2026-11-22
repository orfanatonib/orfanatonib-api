import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { TeamEntity } from "../entities/team.entity";
import { TeamsRepository } from "./teams.repository";

const SHELTER_ID = "shelter-1";

const team = (overrides: Partial<TeamEntity> = {}): TeamEntity =>
  Object.assign(new TeamEntity(), {
    id: "team-1",
    numberTeam: 1,
    shelter: { id: SHELTER_ID },
    leaders: [],
    members: [],
    ...overrides,
  });

describe("TeamsRepository — regras de escrita", () => {
  const memberRepo = { findBy: jest.fn() };
  const txTeamRepo = { delete: jest.fn() };
  const txManager = {
    query: jest.fn(),
    getRepository: jest.fn(() => txTeamRepo),
  };
  const teamRepo = {
    create: jest.fn((value: Partial<TeamEntity>) => value as TeamEntity),
    save: jest.fn((value: TeamEntity) => Promise.resolve(value)),
    findOne: jest.fn(),
    manager: {
      getRepository: jest.fn(() => memberRepo),
      transaction: jest.fn(
        (work: (manager: typeof txManager) => Promise<void>) => work(txManager),
      ),
    },
  };
  const leaderRepo = { findBy: jest.fn() };

  let repository: TeamsRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TeamsRepository,
        { provide: getRepositoryToken(TeamEntity), useValue: teamRepo },
        {
          provide: getRepositoryToken(LeaderProfileEntity),
          useValue: leaderRepo,
        },
      ],
    }).compile();
    repository = moduleRef.get(TeamsRepository);
    teamRepo.findOne.mockResolvedValue(null);
    leaderRepo.findBy.mockResolvedValue([]);
    memberRepo.findBy.mockResolvedValue([]);
    txManager.query.mockResolvedValue(undefined);
    txTeamRepo.delete.mockResolvedValue(undefined);
  });

  describe("create", () => {
    it("saves the team with the leaders and members of the payload", async () => {
      const leader = { id: "leader-1" } as LeaderProfileEntity;
      const member = { id: "member-1" } as MemberProfileEntity;
      leaderRepo.findBy.mockResolvedValue([leader]);
      memberRepo.findBy.mockResolvedValue([member]);

      await repository.create({
        numberTeam: 2,
        shelterId: SHELTER_ID,
        leaderProfileIds: ["leader-1"],
        memberProfileIds: ["member-1"],
      });

      expect(teamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          numberTeam: 2,
          leaders: [leader],
          members: [member],
        }),
      );
    });

    it("refuses a number already used in the same shelter, without saving", async () => {
      teamRepo.findOne.mockResolvedValue(team({ numberTeam: 2 }));

      await expect(
        repository.create({ numberTeam: 2, shelterId: SHELTER_ID }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it("refuses a leader id that does not exist, without saving", async () => {
      leaderRepo.findBy.mockResolvedValue([]);

      await expect(
        repository.create({
          numberTeam: 3,
          shelterId: SHELTER_ID,
          leaderProfileIds: ["leader-fantasma"],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it("refuses a member id that does not exist, without saving", async () => {
      await expect(
        repository.create({
          numberTeam: 3,
          shelterId: SHELTER_ID,
          memberProfileIds: ["member-fantasma"],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(teamRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("lets a team keep its own number", async () => {
      const current = team({ numberTeam: 4 });
      teamRepo.findOne.mockResolvedValue(current);

      await repository.update("team-1", { numberTeam: 4, description: "x" });

      expect(teamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: "x" }),
      );
    });

    it("refuses to take the number of another team of the shelter", async () => {
      teamRepo.findOne
        .mockResolvedValueOnce(team({ id: "team-1", numberTeam: 1 }))
        .mockResolvedValueOnce(team({ id: "team-2", numberTeam: 2 }));

      await expect(
        repository.update("team-1", { numberTeam: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it("refuses leader ids that do not exist instead of silently emptying the team", async () => {
      teamRepo.findOne.mockResolvedValue(team());
      leaderRepo.findBy.mockResolvedValue([]);

      await expect(
        repository.update("team-1", { leaderProfileIds: ["leader-fantasma"] }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it("clears the leaders when an empty list is sent on purpose", async () => {
      teamRepo.findOne.mockResolvedValue(
        team({ leaders: [{ id: "leader-1" } as LeaderProfileEntity] }),
      );

      await repository.update("team-1", { leaderProfileIds: [] });

      expect(teamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ leaders: [] }),
      );
    });

    it("is NotFound for an unknown team", async () => {
      teamRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.update("nope", { description: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
  describe("remove", () => {
    it("releases leaders and members before deleting the team, in one transaction", async () => {
      await repository.remove("team-1");

      expect(teamRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("DELETE FROM leader_teams"),
        ["team-1"],
      );
      expect(txManager.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE member_profiles SET team_id = NULL"),
        ["team-1"],
      );
      expect(txTeamRepo.delete).toHaveBeenCalledWith("team-1");
    });

    it("propagates a failure so the transaction rolls back", async () => {
      const failure = new Error("banco fora");
      txTeamRepo.delete.mockRejectedValue(failure);

      await expect(repository.remove("team-1")).rejects.toBe(failure);
    });
  });
  describe("replaceLeaderTeams", () => {
    const manager = txManager as typeof txManager & {
      getRepository: jest.Mock;
    };
    const txTeams = {
      findOne: jest.fn(),
      save: jest.fn((team: TeamEntity) =>
        Promise.resolve(Object.assign(team, { id: "team-novo" })),
      ),
      create: jest.fn((value: Partial<TeamEntity>) => value as TeamEntity),
    };

    beforeEach(() => {
      manager.getRepository.mockReturnValue(txTeams);
      txTeams.findOne.mockResolvedValue(null);
    });

    it("refuses an unknown shelter before touching any link", async () => {
      manager.query.mockResolvedValueOnce([]);

      await expect(
        repository.replaceLeaderTeams("leader-1", [
          { shelterId: "fantasma", teams: [1] },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(txTeams.save).not.toHaveBeenCalled();
    });

    it("creates a missing team once even when the number is repeated, then drops the other links", async () => {
      manager.query.mockResolvedValueOnce([{ id: "shelter-1" }]);

      await repository.replaceLeaderTeams("leader-1", [
        { shelterId: "shelter-1", teams: [3, 3] },
        { shelterId: "shelter-1", teams: [3] },
      ]);

      expect(txTeams.save).toHaveBeenCalledTimes(1);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT IN (?)"),
        ["leader-1", "team-novo"],
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT IGNORE INTO leader_teams"),
        ["leader-1", "team-novo"],
      );
    });

    it("reuses an existing team and an empty request just releases the leader", async () => {
      manager.query.mockResolvedValueOnce([{ id: "shelter-1" }]);
      txTeams.findOne.mockResolvedValue(team({ id: "team-9", numberTeam: 2 }));

      await repository.replaceLeaderTeams("leader-1", [
        { shelterId: "shelter-1", teams: [2] },
      ]);
      expect(txTeams.save).not.toHaveBeenCalled();

      manager.query.mockClear();
      await repository.replaceLeaderTeams("leader-1", []);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM leader_teams WHERE leader_id = ?"),
        ["leader-1"],
      );
    });
  });
  describe("assignMemberToTeam", () => {
    const manager = txManager as typeof txManager & {
      getRepository: jest.Mock;
    };
    const txTeams = {
      findOne: jest.fn(),
      save: jest.fn((value: TeamEntity) =>
        Promise.resolve(Object.assign(value, { id: "team-novo" })),
      ),
      create: jest.fn((value: Partial<TeamEntity>) => value as TeamEntity),
    };

    beforeEach(() => {
      manager.getRepository.mockReturnValue(txTeams);
      txTeams.findOne.mockResolvedValue(null);
    });

    it("refuses an unknown member without touching anything", async () => {
      manager.query.mockResolvedValueOnce([]);

      await expect(
        repository.assignMemberToTeam("fantasma", SHELTER_ID, 2),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(txTeams.save).not.toHaveBeenCalled();
    });

    it("refuses an unknown shelter before creating any team or moving the member", async () => {
      manager.query
        .mockResolvedValueOnce([{ team_id: "team-antiga" }])
        .mockResolvedValueOnce([]);

      await expect(
        repository.assignMemberToTeam("member-1", "fantasma", 2),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(txTeams.save).not.toHaveBeenCalled();
      expect(manager.query).toHaveBeenCalledTimes(2);
    });

    it("creates the missing team and moves the member in one go", async () => {
      manager.query
        .mockResolvedValueOnce([{ team_id: "team-antiga" }])
        .mockResolvedValueOnce([{ id: SHELTER_ID }]);

      const result = await repository.assignMemberToTeam(
        "member-1",
        SHELTER_ID,
        2,
      );

      expect(result).toEqual({ teamId: "team-novo", changed: true });
      expect(manager.query).toHaveBeenLastCalledWith(
        expect.stringContaining("UPDATE member_profiles SET team_id = ?"),
        ["team-novo", "member-1"],
      );
    });

    it("is idempotent when the member is already in the team", async () => {
      manager.query
        .mockResolvedValueOnce([{ team_id: "team-9" }])
        .mockResolvedValueOnce([{ id: SHELTER_ID }]);
      txTeams.findOne.mockResolvedValue(team({ id: "team-9", numberTeam: 2 }));

      const result = await repository.assignMemberToTeam(
        "member-1",
        SHELTER_ID,
        2,
      );

      expect(result).toEqual({ teamId: "team-9", changed: false });
      expect(manager.query).toHaveBeenCalledTimes(2);
    });
  });
});
