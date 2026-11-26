import { Test } from "@nestjs/testing";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetOneProfileService } from "src/core/profile/services/profile/get-one-profile.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { GetMeService } from "./get-me.service";
import {
  AUTH_USER_MEDIA_TARGET,
  AuthErrorMessages,
} from "../constants/auth.constants";
import {
  buildLeaderProfile,
  buildMediaItem,
  buildMemberProfile,
  buildUserEntity,
} from "../auth.fixtures";

describe("GetMeService", () => {
  const getUsersService = { findWithProfiles: jest.fn() };
  const getOneProfileService = { execute: jest.fn() };
  const mediaItemProcessor = { findMediaItemByTarget: jest.fn() };

  let service: GetMeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetMeService,
        { provide: GetUsersService, useValue: getUsersService },
        { provide: GetOneProfileService, useValue: getOneProfileService },
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
      ],
    }).compile();

    service = moduleRef.get(GetMeService);

    getUsersService.findWithProfiles.mockResolvedValue(buildUserEntity());
    getOneProfileService.execute.mockResolvedValue({
      personalData: undefined,
      preferences: undefined,
    });
    mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(null);
  });

  it("loads the user with the profiles already joined", async () => {
    await service.execute("user-id");

    expect(getUsersService.findWithProfiles).toHaveBeenCalledWith("user-id");
  });

  it("looks the profile picture up by the user media target", async () => {
    mediaItemProcessor.findMediaItemByTarget.mockResolvedValue(
      buildMediaItem(),
    );

    const result = await service.execute("user-id");

    expect(mediaItemProcessor.findMediaItemByTarget).toHaveBeenCalledWith(
      "user-id",
      AUTH_USER_MEDIA_TARGET,
    );
    expect(result.image?.url).toBe("https://bucket/avatar.png");
  });

  it("takes the personal data and the preferences from the profile contract", async () => {
    getOneProfileService.execute.mockResolvedValue({
      personalData: { birthDate: "1990-05-02", gender: "F" },
      preferences: { favoriteColor: "azul" },
    });

    const result = await service.execute("user-id");

    expect(getOneProfileService.execute).toHaveBeenCalledWith("user-id");
    expect(result.personalData).toEqual({
      birthDate: "1990-05-02",
      gender: "F",
    });
    expect(result.preferences).toEqual({ favoriteColor: "azul" });
  });

  it("returns the member and leader trees when the user has them", async () => {
    getUsersService.findWithProfiles.mockResolvedValue(
      buildUserEntity({
        memberProfile: buildMemberProfile(),
        leaderProfile: buildLeaderProfile(),
      }),
    );

    const result = await service.execute("user-id");

    expect(result.memberProfile?.team?.shelter?.name).toBe("Abrigo Esperança");
    expect(result.leaderProfile?.teams).toHaveLength(1);
  });

  it("never exposes the password hash nor the refresh token", async () => {
    getUsersService.findWithProfiles.mockResolvedValue(
      buildUserEntity({ password: "$2a$10$segredo", refreshToken: "guardado" }),
    );

    const result = await service.execute("user-id");

    expect(JSON.stringify(result)).not.toContain("segredo");
    expect(JSON.stringify(result)).not.toContain("guardado");
  });

  it("reports 401 when the token points at a user that no longer exists", async () => {
    getUsersService.findWithProfiles.mockResolvedValue(null);

    await expect(service.execute("user-id")).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.USER_NOT_FOUND),
    );
    expect(mediaItemProcessor.findMediaItemByTarget).not.toHaveBeenCalled();
  });
});
