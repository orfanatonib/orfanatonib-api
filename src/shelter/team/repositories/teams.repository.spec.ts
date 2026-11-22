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
});
