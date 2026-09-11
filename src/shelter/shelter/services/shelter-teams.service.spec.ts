import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { TeamsService } from "src/shelter/team/services/teams.service";
import { ShelterTeamsService } from "./shelter-teams.service";
import { SHELTER_MESSAGES } from "../constants";

describe("ShelterTeamsService", () => {
  const teamsService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByShelter: jest.fn(),
  };

  let service: ShelterTeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelterTeamsService,
        { provide: TeamsService, useValue: teamsService },
      ],
    }).compile();

    service = moduleRef.get(ShelterTeamsService);

    teamsService.create.mockResolvedValue(undefined);
    teamsService.update.mockResolvedValue(undefined);
    teamsService.remove.mockResolvedValue(undefined);
    teamsService.findByShelter.mockResolvedValue([]);
  });

  describe("createForShelter", () => {
    it("creates exactly the teams 1..N", async () => {
      await service.createForShelter("shelter-id", 3, undefined);

      expect(teamsService.create).toHaveBeenCalledTimes(3);
      expect(
        teamsService.create.mock.calls.map(
          ([dto]: [{ numberTeam: number }]) => dto.numberTeam,
        ),
      ).toEqual([1, 2, 3]);
    });

    it("applies the payload to the teams it names and leaves the rest bare", async () => {
      await service.createForShelter("shelter-id", 2, [
        {
          numberTeam: 2,
          description: "Equipe dois",
          leaderProfileIds: ["leader-1"],
          memberProfileIds: ["member-1"],
        },
      ]);

      expect(teamsService.create).toHaveBeenNthCalledWith(1, {
        numberTeam: 1,
        description: undefined,
        shelterId: "shelter-id",
        leaderProfileIds: undefined,
        memberProfileIds: undefined,
      });
      expect(teamsService.create).toHaveBeenNthCalledWith(2, {
        numberTeam: 2,
        description: "Equipe dois",
        shelterId: "shelter-id",
        leaderProfileIds: ["leader-1"],
        memberProfileIds: ["member-1"],
      });
    });

    it("creates nothing when the shelter has no teams", async () => {
      await service.createForShelter("shelter-id", 0, undefined);

      expect(teamsService.create).not.toHaveBeenCalled();
    });

    it.each([[0], [3]])(
      "refuses the team number %s outside 1..2",
      async (numberTeam) => {
        await expect(
          service.createForShelter("shelter-id", 2, [{ numberTeam }]),
        ).rejects.toThrow(
          new RuleException(SHELTER_MESSAGES.TEAM_OUT_OF_RANGE(numberTeam, 2)),
        );
        expect(teamsService.create).not.toHaveBeenCalled();
      },
    );

    it("refuses the same team declared twice", async () => {
      await expect(
        service.createForShelter("shelter-id", 2, [
          { numberTeam: 1 },
          { numberTeam: 1 },
        ]),
      ).rejects.toThrow(new RuleException(SHELTER_MESSAGES.TEAM_DUPLICATED(1)));
    });

    it("refuses a member allocated to more than one team", async () => {
      await expect(
        service.createForShelter("shelter-id", 2, [
          { numberTeam: 1, memberProfileIds: ["member-1"] },
          { numberTeam: 2, memberProfileIds: ["member-1"] },
        ]),
      ).rejects.toThrow(
        new RuleException(
          SHELTER_MESSAGES.MEMBER_IN_MULTIPLE_TEAMS("member-1"),
        ),
      );
    });
  });

  describe("syncForShelter", () => {
    it("removes the teams above the new quantity", async () => {
      teamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
        { id: "team-2", numberTeam: 2 },
        { id: "team-3", numberTeam: 3 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 3);

      expect(teamsService.remove).toHaveBeenCalledTimes(2);
      expect(teamsService.remove).toHaveBeenCalledWith("team-2");
      expect(teamsService.remove).toHaveBeenCalledWith("team-3");
      expect(teamsService.create).not.toHaveBeenCalled();
    });

    it("skips a team that is already gone from the database", async () => {
      teamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 3);

      expect(teamsService.remove).not.toHaveBeenCalled();
    });

    it("updates the teams that exist and creates the ones that are missing", async () => {
      teamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
      ]);

      await service.syncForShelter(
        "shelter-id",
        2,
        [
          { numberTeam: 1, description: "Renomeada", leaderProfileIds: ["l1"] },
          { numberTeam: 2, memberProfileIds: ["m1"] },
        ],
        1,
      );

      expect(teamsService.update).toHaveBeenCalledWith("team-1", {
        description: "Renomeada",
        leaderProfileIds: ["l1"],
        memberProfileIds: [],
      });
      expect(teamsService.create).toHaveBeenCalledWith({
        numberTeam: 2,
        description: undefined,
        shelterId: "shelter-id",
        leaderProfileIds: undefined,
        memberProfileIds: ["m1"],
      });
    });

    it("clears the people of a team the payload does not describe", async () => {
      teamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 1);

      expect(teamsService.update).toHaveBeenCalledWith("team-1", {
        description: undefined,
        leaderProfileIds: [],
        memberProfileIds: [],
      });
    });

    it("allows the same member in two teams on an update, unlike on creation", async () => {
      teamsService.findByShelter.mockResolvedValue([]);

      await expect(
        service.syncForShelter(
          "shelter-id",
          2,
          [
            { numberTeam: 1, memberProfileIds: ["member-1"] },
            { numberTeam: 2, memberProfileIds: ["member-1"] },
          ],
          2,
        ),
      ).resolves.toBeUndefined();
    });

    it("validates the numbering before touching the database", async () => {
      await expect(
        service.syncForShelter("shelter-id", 1, [{ numberTeam: 5 }], 1),
      ).rejects.toThrow(RuleException);

      expect(teamsService.findByShelter).not.toHaveBeenCalled();
    });
  });
});
