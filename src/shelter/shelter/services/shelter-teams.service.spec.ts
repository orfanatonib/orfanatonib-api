import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { CreateTeamService } from "src/shelter/team/services/create-team.service";
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import { UpdateTeamService } from "src/shelter/team/services/update-team.service";
import { DeleteTeamService } from "src/shelter/team/services/delete-team.service";
import { ShelterTeamsService } from "./shelter-teams.service";
import { SHELTER_MESSAGES } from "../constants";

describe("ShelterTeamsService", () => {
  const createTeamService = { execute: jest.fn() };
  const getTeamsService = { findByShelter: jest.fn() };
  const updateTeamService = { execute: jest.fn() };
  const deleteTeamService = { execute: jest.fn() };

  let service: ShelterTeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelterTeamsService,
        { provide: CreateTeamService, useValue: createTeamService },
        { provide: GetTeamsService, useValue: getTeamsService },
        { provide: UpdateTeamService, useValue: updateTeamService },
        { provide: DeleteTeamService, useValue: deleteTeamService },
      ],
    }).compile();

    service = moduleRef.get(ShelterTeamsService);

    createTeamService.execute.mockResolvedValue(undefined);
    updateTeamService.execute.mockResolvedValue(undefined);
    deleteTeamService.execute.mockResolvedValue(undefined);
    getTeamsService.findByShelter.mockResolvedValue([]);
  });

  describe("createForShelter", () => {
    it("creates exactly the teams 1..N", async () => {
      await service.createForShelter("shelter-id", 3, undefined);

      expect(createTeamService.execute).toHaveBeenCalledTimes(3);
      expect(
        createTeamService.execute.mock.calls.map(
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

      expect(createTeamService.execute).toHaveBeenNthCalledWith(1, {
        numberTeam: 1,
        description: undefined,
        shelterId: "shelter-id",
        leaderProfileIds: undefined,
        memberProfileIds: undefined,
      });
      expect(createTeamService.execute).toHaveBeenNthCalledWith(2, {
        numberTeam: 2,
        description: "Equipe dois",
        shelterId: "shelter-id",
        leaderProfileIds: ["leader-1"],
        memberProfileIds: ["member-1"],
      });
    });

    it("creates nothing when the shelter has no teams", async () => {
      await service.createForShelter("shelter-id", 0, undefined);

      expect(createTeamService.execute).not.toHaveBeenCalled();
    });

    it.each([[0], [3]])(
      "refuses the team number %s outside 1..2",
      async (numberTeam) => {
        await expect(
          service.createForShelter("shelter-id", 2, [{ numberTeam }]),
        ).rejects.toThrow(
          new RuleException(SHELTER_MESSAGES.TEAM_OUT_OF_RANGE(numberTeam, 2)),
        );
        expect(createTeamService.execute).not.toHaveBeenCalled();
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
      getTeamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
        { id: "team-2", numberTeam: 2 },
        { id: "team-3", numberTeam: 3 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 3);

      expect(deleteTeamService.execute).toHaveBeenCalledTimes(2);
      expect(deleteTeamService.execute).toHaveBeenCalledWith("team-2");
      expect(deleteTeamService.execute).toHaveBeenCalledWith("team-3");
      expect(createTeamService.execute).not.toHaveBeenCalled();
    });

    it("skips a team that is already gone from the database", async () => {
      getTeamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 3);

      expect(deleteTeamService.execute).not.toHaveBeenCalled();
    });

    it("updates the teams that exist and creates the ones that are missing", async () => {
      getTeamsService.findByShelter.mockResolvedValue([
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

      expect(updateTeamService.execute).toHaveBeenCalledWith("team-1", {
        description: "Renomeada",
        leaderProfileIds: ["l1"],
        memberProfileIds: [],
      });
      expect(createTeamService.execute).toHaveBeenCalledWith({
        numberTeam: 2,
        description: undefined,
        shelterId: "shelter-id",
        leaderProfileIds: undefined,
        memberProfileIds: ["m1"],
      });
    });

    it("clears the people of a team the payload does not describe", async () => {
      getTeamsService.findByShelter.mockResolvedValue([
        { id: "team-1", numberTeam: 1 },
      ]);

      await service.syncForShelter("shelter-id", 1, undefined, 1);

      expect(updateTeamService.execute).toHaveBeenCalledWith("team-1", {
        description: undefined,
        leaderProfileIds: [],
        memberProfileIds: [],
      });
    });

    it("allows the same member in two teams on an update, unlike on creation", async () => {
      getTeamsService.findByShelter.mockResolvedValue([]);

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

      expect(getTeamsService.findByShelter).not.toHaveBeenCalled();
    });
  });
});
