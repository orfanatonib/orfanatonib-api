import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { AuthTokenService } from "./auth-token.service";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import { UserRole } from "../auth.types";
import { buildUserEntity } from "../auth.fixtures";

describe("AuthTokenService", () => {
  const jwtService = { sign: jest.fn(), verify: jest.fn() };
  const configService = { getOrThrow: jest.fn() };
  const getUsersService = { findByIdOrNull: jest.fn() };
  const updateUserService = { setRefreshToken: jest.fn() };

  let service: AuthTokenService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthTokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: GetUsersService, useValue: getUsersService },
        { provide: UpdateUserService, useValue: updateUserService },
      ],
    }).compile();

    service = moduleRef.get(AuthTokenService);

    jwtService.sign.mockImplementation((_claims: unknown, options?: unknown) =>
      options ? "refresh-token" : "access-token",
    );
    configService.getOrThrow.mockImplementation((key: string) =>
      key === "JWT_REFRESH_SECRET" ? "refresh-secret" : "7d",
    );
    updateUserService.setRefreshToken.mockResolvedValue(undefined);
  });

  describe("issueFor", () => {
    it("signs the access and the refresh token with the user claims", async () => {
      const user = buildUserEntity({ role: UserRole.LEADER });

      await expect(service.issueFor(user)).resolves.toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const claims = {
        sub: "user-id",
        email: "maria@orfanatonib.test",
        role: UserRole.LEADER,
      };
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, claims);
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { ...claims, jti: expect.any(String) as unknown as string },
        { secret: "refresh-secret", expiresIn: "7d" },
      );
    });

    it("gives every refresh a fresh jti, so rotation really invalidates", async () => {
      await service.issueFor(buildUserEntity());
      await service.issueFor(buildUserEntity());

      // Chamadas 0 e 2 são os access tokens; 1 e 3, os refresh.
      const signCalls = jwtService.sign.mock.calls as Array<
        [{ jti?: string }, unknown?]
      >;
      const jtiOf = (call: number): string | undefined =>
        signCalls[call][0].jti;

      expect(jtiOf(1)).toEqual(expect.any(String));
      expect(jtiOf(3)).not.toBe(jtiOf(1));
    });

    it("persists the refresh token, which the renewal compares against", async () => {
      await service.issueFor(buildUserEntity());

      expect(updateUserService.setRefreshToken).toHaveBeenCalledWith(
        "user-id",
        "refresh-token",
      );
    });
  });

  describe("refresh", () => {
    it("issues a new pair for a token that matches the stored one", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-id" });
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ refreshToken: "guardado" }),
      );

      await expect(service.refresh("guardado")).resolves.toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      expect(jwtService.verify).toHaveBeenCalledWith("guardado", {
        secret: "refresh-secret",
      });
    });

    it("refuses a request with no refresh token", async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        new UnauthenticatedException(AuthErrorMessages.REFRESH_TOKEN_REQUIRED),
      );
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("refuses a token that does not verify", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      await expect(service.refresh("lixo")).rejects.toThrow(
        new UnauthenticatedException(AuthErrorMessages.INVALID_REFRESH_TOKEN),
      );
    });

    it("refuses a valid token whose user no longer exists", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-id" });
      getUsersService.findByIdOrNull.mockResolvedValue(null);

      await expect(service.refresh("valido")).rejects.toThrow(
        UnauthenticatedException,
      );
    });

    it("refuses a valid token that is no longer the last one issued", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-id" });
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ refreshToken: "outro-mais-novo" }),
      );

      await expect(service.refresh("antigo")).rejects.toThrow(
        new UnauthenticatedException(AuthErrorMessages.INVALID_REFRESH_TOKEN),
      );
    });

    it("refuses a token of a user that was logged out", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-id" });
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ refreshToken: null }),
      );

      await expect(service.refresh("antigo")).rejects.toThrow(
        UnauthenticatedException,
      );
    });
  });

  describe("logout", () => {
    it("clears the stored refresh token", async () => {
      await expect(service.logout("user-id")).resolves.toEqual({
        message: AuthSuccessMessages.LOGOUT_SUCCESS,
      });

      expect(updateUserService.setRefreshToken).toHaveBeenCalledWith(
        "user-id",
        null,
      );
    });
  });
});
