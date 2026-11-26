import {
  toShelterDto,
  toShelterSimpleDto,
  toShelterWithLeaderStatusDto,
} from "./shelter.mapper";
import {
  buildLeaderProfile,
  buildMediaItem,
  buildShelterEntity,
  buildTeamEntity,
  buildUserEntity,
} from "../shelter.fixtures";

describe("toShelterDto", () => {
  it("exposes the shelter with its teams, people and main photo", () => {
    const dto = toShelterDto(
      buildShelterEntity({ mediaItem: buildMediaItem() }),
    );

    expect(dto).toMatchObject({
      id: "shelter-id",
      name: "Abrigo Esperança",
      teamsQuantity: 1,
    });
    expect(dto.address?.city).toBe("Manaus");
    expect(dto.teams).toHaveLength(1);
    expect(dto.teams[0].leaders[0].user.email).toBe("maria@orfanatonib.test");
    expect(dto.mediaItem?.url).toBe("https://bucket/abrigo.png");
  });

  it("hides the address when the feature flag is off", () => {
    const dto = toShelterDto(buildShelterEntity(), false);

    expect(dto.address).toBeUndefined();
  });

  it("never leaks entity fields that are not exposed", () => {
    const dto = toShelterDto(buildShelterEntity());

    expect(dto).not.toHaveProperty("route");
    expect(dto).not.toHaveProperty("sheltered");
  });

  it("yields an empty team list when the relation was not loaded", () => {
    const dto = toShelterDto(
      buildShelterEntity({ teams: undefined as unknown as [] }),
    );

    expect(dto.teams).toEqual([]);
  });

  it("collapses into a single entry a leader who is in more than one team", () => {
    const leader = buildLeaderProfile();
    const dto = toShelterDto(
      buildShelterEntity({
        teams: [
          buildTeamEntity({ id: "team-1", numberTeam: 1, leaders: [leader] }),
          buildTeamEntity({ id: "team-2", numberTeam: 2, leaders: [leader] }),
        ],
      }),
    );

    expect(dto.leaders).toHaveLength(1);
    expect(dto.leaders[0].id).toBe("leader-profile-id");
  });
});

describe("toShelterSimpleDto", () => {
  it("keeps the shelter summary and honours the address flag", () => {
    expect(toShelterSimpleDto(buildShelterEntity()).address?.state).toBe("AM");
    expect(
      toShelterSimpleDto(buildShelterEntity(), false).address,
    ).toBeUndefined();
  });
});

describe("toShelterWithLeaderStatusDto", () => {
  const shelter = buildShelterEntity({
    teams: [
      buildTeamEntity({
        id: "team-1",
        numberTeam: 1,
        leaders: [buildLeaderProfile({ id: "leader-a" })],
      }),
      buildTeamEntity({
        id: "team-2",
        numberTeam: 2,
        leaders: [
          buildLeaderProfile({
            id: "leader-b",
            user: buildUserEntity({ id: "other-user-id" }),
          }),
        ],
      }),
    ],
  });

  it("flags only the teams the leader belongs to", () => {
    const dto = toShelterWithLeaderStatusDto(shelter, "leader-a");

    expect(dto.teams.map((team) => team.isLeaderInTeam)).toEqual([true, false]);
  });

  it("flags nothing when the leader is in no team of the shelter", () => {
    const dto = toShelterWithLeaderStatusDto(shelter, "outsider");

    expect(dto.teams.every((team) => !team.isLeaderInTeam)).toBe(true);
  });

  it("handles a shelter with no teams and honours the address flag", () => {
    const dto = toShelterWithLeaderStatusDto(
      buildShelterEntity({ teams: undefined as unknown as [] }),
      "leader-a",
      false,
    );

    expect(dto.teams).toEqual([]);
    expect(dto.address).toBeUndefined();
  });
});
