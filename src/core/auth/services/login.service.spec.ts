import { Test } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { LoginService } from "./login.service";
import { AuthTokenService } from "./auth-token.service";
import { EmailVerificationService } from "./email-verification.service";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import { buildLoginDto, buildTokens, buildUserEntity } from "../auth.fixtures";

/**
 * `bcrypt.compare` tem sobrecarga com callback; o spy é tipado na sobrecarga
 * que o serviço usa para o lint não ver promessa em posição de `void`.
 */
const mockPasswordMatch = (matches: boolean): void => {
  const compare = jest.spyOn(bcrypt, "compare") as unknown as jest.SpyInstance<
    Promise<boolean>,
    [string, string]
  >;
  compare.mockResolvedValue(matches);
};

describe("LoginService", () => {
  const getUsersService = { findByEmail: jest.fn() };
  const tokenService = { issueFor: jest.fn() };
  const emailVerification = { statusFor: jest.fn() };

  let service: LoginService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: GetUsersService, useValue: getUsersService },
        { provide: AuthTokenService, useValue: tokenService },
        {
          provide: EmailVerificationService,
          useValue: emailVerification,
        },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(LoginService);

    getUsersService.findByEmail.mockResolvedValue(buildUserEntity());
    tokenService.issueFor.mockResolvedValue(buildTokens());
    emailVerification.statusFor.mockReturnValue(undefined);
    mockPasswordMatch(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns the user and the token pair for valid credentials", async () => {
    const result = await service.execute(buildLoginDto());

    expect(result).toMatchObject({
      message: AuthSuccessMessages.LOGIN_SUCCESS,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(result.user.id).toBe("user-id");
  });

  it("never exposes the password hash in the response", async () => {
    const result = await service.execute(buildLoginDto());

    expect(result.user).not.toHaveProperty("password");
    expect(result.user).not.toHaveProperty("refreshToken");
  });

  it("compares the password against the stored hash", async () => {
    await service.execute(buildLoginDto({ password: "E2e@12345" }));

    expect(bcrypt.compare).toHaveBeenCalledWith("E2e@12345", "$2a$10$hash");
  });

  it("refuses an email that does not exist", async () => {
    getUsersService.findByEmail.mockResolvedValue(null);

    await expect(service.execute(buildLoginDto())).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.INVALID_CREDENTIALS),
    );
    expect(tokenService.issueFor).not.toHaveBeenCalled();
  });

  it("refuses a wrong password with the very same message", async () => {
    mockPasswordMatch(false);

    await expect(service.execute(buildLoginDto())).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.INVALID_CREDENTIALS),
    );
  });

  it("answers an inactive account with 200 and no tokens", async () => {
    getUsersService.findByEmail.mockResolvedValue(
      buildUserEntity({ active: false }),
    );

    const result = await service.execute(buildLoginDto());

    expect(result).toMatchObject({
      message: AuthSuccessMessages.USER_INACTIVE,
    });
    expect(result.user.active).toBe(false);
    expect(result).not.toHaveProperty("accessToken");
    expect(tokenService.issueFor).not.toHaveBeenCalled();
  });
});
