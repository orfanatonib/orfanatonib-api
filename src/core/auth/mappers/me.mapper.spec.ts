import { toMediaResponseDto, toMeDto } from "./me.mapper";
import { UserRole } from "../auth.types";
import {
  buildLeaderProfile,
  buildMediaItem,
  buildMemberProfile,
  buildShelterEntity,
  buildTeamEntity,
  buildUserEntity,
} from "../auth.fixtures";

const noExtras = { image: null };

describe("toMeDto", () => {
  it("exposes the identity fields the frontend session needs", () => {
    const dto = toMeDto(buildUserEntity({ role: UserRole.LEADER }), noExtras);

    expect(dto).toMatchObject({
      id: "user-id",
      email: "maria@orfanatonib.test",
      phone: "92999990000",
      name: "Maria Souza",
      role: UserRole.LEADER,
      commonUser: false,
    });
  });

  it("never leaks the password hash nor the refresh token", () => {
    const dto = toMeDto(
      buildUserEntity({ password: "$2a$10$segredo", refreshToken: "guardado" }),
      noExtras,
    );

    expect(dto).not.toHaveProperty("password");
    expect(dto).not.toHaveProperty("refreshToken");
  });

  it("yields null profiles when the user has none", () => {
    const dto = toMeDto(buildUserEntity(), noExtras);

    expect(dto.memberProfile).toBeNull();
    expect(dto.leaderProfile).toBeNull();
    expect(dto.image).toBeNull();
  });

  it("builds the member tree down to the shelter address", () => {
    const dto = toMeDto(
      buildUserEntity({ memberProfile: buildMemberProfile() }),
      noExtras,
    );

    expect(dto.memberProfile).toMatchObject({
      id: "member-profile-id",
      active: true,
      team: {
        id: "team-id",
        numberTeam: 1,
        shelter: {
          id: "shelter-id",
          name: "Abrigo Esperança",
          address: { city: "Manaus", state: "AM" },
        },
      },
    });
  });

  it("tolerates a member with no team", () => {
    const dto = toMeDto(
      buildUserEntity({ memberProfile: buildMemberProfile({ team: null }) }),
      noExtras,
    );

    expect(dto.memberProfile?.team).toBeNull();
  });

  it("tolerates a team with no shelter and a shelter with no address", () => {
    const dto = toMeDto(
      buildUserEntity({
        memberProfile: buildMemberProfile({
          team: buildTeamEntity({ shelter: null as never }),
        }),
        leaderProfile: buildLeaderProfile({
          teams: [
            buildTeamEntity({
              shelter: buildShelterEntity({ address: null as never }),
            }),
          ],
        }),
      }),
      noExtras,
    );

    expect(dto.memberProfile?.team?.shelter).toBeNull();
    expect(dto.leaderProfile?.teams[0].shelter?.address).toBeNull();
  });

  it("lists every team of a leader", () => {
    const dto = toMeDto(
      buildUserEntity({
        leaderProfile: buildLeaderProfile({
          teams: [
            buildTeamEntity({ id: "team-1", numberTeam: 1 }),
            buildTeamEntity({ id: "team-2", numberTeam: 2 }),
          ],
        }),
      }),
      noExtras,
    );

    expect(dto.leaderProfile?.teams.map((team) => team.id)).toEqual([
      "team-1",
      "team-2",
    ]);
  });

  it("yields an empty list when the leader teams were not loaded", () => {
    const dto = toMeDto(
      buildUserEntity({
        leaderProfile: buildLeaderProfile({ teams: undefined as never }),
      }),
      noExtras,
    );

    expect(dto.leaderProfile?.teams).toEqual([]);
  });

  it("carries the profile picture and the profile extras through", () => {
    const dto = toMeDto(buildUserEntity(), {
      image: buildMediaItem(),
      personalData: { gender: "F", birthDate: "1990-05-02" },
      preferences: { favoriteColor: "azul" },
    });

    expect(dto.image).toMatchObject({
      id: "media-id",
      url: "https://bucket/avatar.png",
      isLocalFile: true,
    });
    expect(dto.personalData).toEqual({ gender: "F", birthDate: "1990-05-02" });
    expect(dto.preferences).toEqual({ favoriteColor: "azul" });
  });

  it("leaves the extras undefined when the profile has none", () => {
    const dto = toMeDto(buildUserEntity(), noExtras);

    expect(dto.personalData).toBeUndefined();
    expect(dto.preferences).toBeUndefined();
  });
});

describe("toMediaResponseDto", () => {
  it("returns null for missing media", () => {
    expect(toMediaResponseDto(null)).toBeNull();
    expect(toMediaResponseDto(undefined)).toBeNull();
  });

  it("copies the media fields the frontend renders", () => {
    expect(toMediaResponseDto(buildMediaItem())).toMatchObject({
      title: "Foto de perfil",
      originalName: "avatar.png",
      size: 1024,
    });
  });
});
