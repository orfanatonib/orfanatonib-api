import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthenticatedException } from "src/common/exceptions";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { GoogleLoginService } from "./google-login.service";
import { AuthTokenService } from "./auth-token.service";
import { CompletionTokenService } from "./completion-token.service";
import { UserRole } from "../auth.types";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import { buildTokens, buildUserEntity } from "../auth.fixtures";

type VerifyArgs = { idToken: string; audience: string };
type Ticket = { getPayload: () => unknown };

const verifyIdToken = jest.fn<Promise<Ticket>, [VerifyArgs]>();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (args: VerifyArgs) => verifyIdToken(args),
  })),
}));

const ticketWith = (payload: unknown): Ticket => ({
  getPayload: () => payload,
});

describe("GoogleLoginService", () => {
  const configService = { getOrThrow: jest.fn() };
  const getUsersService = { findByEmail: jest.fn() };
  const createUserService = { create: jest.fn() };
  const tokenService = { issueFor: jest.fn() };
  const completionTokens = { issueFor: jest.fn() };

  let service: GoogleLoginService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GoogleLoginService,
        { provide: ConfigService, useValue: configService },
        { provide: GetUsersService, useValue: getUsersService },
        { provide: CreateUserService, useValue: createUserService },
        { provide: AuthTokenService, useValue: tokenService },
        { provide: CompletionTokenService, useValue: completionTokens },
      ],
    }).compile();
    moduleRef.useLogger(false);

    configService.getOrThrow.mockReturnValue("google-client-id");
    service = moduleRef.get(GoogleLoginService);

    verifyIdToken.mockResolvedValue(
      ticketWith({ email: "maria@orfanatonib.test", name: "Maria Souza" }),
    );
    getUsersService.findByEmail.mockResolvedValue(buildUserEntity());
    createUserService.create.mockResolvedValue(
      buildUserEntity({ active: false, completed: false }),
    );
    tokenService.issueFor.mockResolvedValue(buildTokens());
    completionTokens.issueFor.mockReturnValue("completion-jwt");
  });

  it("validates the credential against the configured client id", async () => {
    await service.execute("google-credential");

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-credential",
      audience: "google-client-id",
    });
  });

  it("signs in an account that is complete and active", async () => {
    const result = await service.execute("credential");

    expect(result).toMatchObject({
      message: AuthSuccessMessages.LOGIN_SUCCESS,
      isNewUser: false,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(result).toHaveProperty("user.id", "user-id");
  });

  it("creates a pending account on the first Google sign-in", async () => {
    getUsersService.findByEmail.mockResolvedValue(null);

    const result = await service.execute("credential");

    expect(createUserService.create).toHaveBeenCalledWith({
      email: "maria@orfanatonib.test",
      name: "Maria Souza",
      password: "",
      phone: "",
      active: false,
      completed: false,
      commonUser: false,
      role: UserRole.MEMBER,
    });
    expect(result).toEqual({
      email: "maria@orfanatonib.test",
      name: "Maria Souza",
      completed: false,
      commonUser: false,
      newUser: true,
      completionToken: "completion-jwt",
    });
    expect(completionTokens.issueFor).toHaveBeenCalledWith("user-id");
    expect(tokenService.issueFor).not.toHaveBeenCalled();
  });

  it("asks an existing but incomplete account to finish registering", async () => {
    getUsersService.findByEmail.mockResolvedValue(
      buildUserEntity({ completed: false }),
    );

    await expect(service.execute("credential")).resolves.toMatchObject({
      completed: false,
      newUser: true,
    });
    expect(createUserService.create).not.toHaveBeenCalled();
    expect(tokenService.issueFor).not.toHaveBeenCalled();
    expect(completionTokens.issueFor).toHaveBeenCalledWith("user-id");
  });

  it("[auth.post.auth-google#conclusao-so-com-posse] a complete account never receives a completion token", async () => {
    const result = await service.execute("credential");

    expect(result).not.toHaveProperty("completionToken");
    expect(completionTokens.issueFor).not.toHaveBeenCalled();
  });

  it("reports an inactive account without issuing tokens", async () => {
    getUsersService.findByEmail.mockResolvedValue(
      buildUserEntity({ active: false }),
    );

    await expect(service.execute("credential")).resolves.toEqual({
      message: AuthErrorMessages.USER_INACTIVE,
      active: false,
      completed: true,
      commonUser: false,
      newUser: false,
    });
    expect(tokenService.issueFor).not.toHaveBeenCalled();
  });

  it.each([
    ["Token used too late, my friend", AuthErrorMessages.GOOGLE_TOKEN_EXPIRED],
    ["the token is expired", AuthErrorMessages.GOOGLE_TOKEN_EXPIRED],
    ["Invalid token signature", AuthErrorMessages.GOOGLE_TOKEN_INVALID],
    ["network unreachable", AuthErrorMessages.GOOGLE_AUTH_FAILED],
  ])("classifies %s as the right message", async (reason, expected) => {
    verifyIdToken.mockRejectedValue(new Error(reason));

    await expect(service.execute("credential")).rejects.toThrow(
      new UnauthenticatedException(expected),
    );
  });

  it("refuses a ticket whose payload has no email or name", async () => {
    verifyIdToken.mockResolvedValue(ticketWith({ email: "maria@x.test" }));

    await expect(service.execute("credential")).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.INVALID_GOOGLE_TOKEN),
    );
  });

  it("refuses a request that carries no credential at all", async () => {
    verifyIdToken.mockRejectedValue(new Error("No pem found for envelope"));

    await expect(service.execute(undefined)).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.GOOGLE_AUTH_FAILED),
    );
  });

  it("does not disguise a database failure as a Google failure", async () => {
    getUsersService.findByEmail.mockRejectedValue(new Error("conexão perdida"));

    await expect(service.execute("credential")).rejects.toThrow(
      "conexão perdida",
    );
  });
  it("[auth.post.auth-google#falha-do-colaborador-sem-efeito-parcial] se a criação da conta falha, nada é emitido nem devolvido como sucesso", async () => {
    getUsersService.findByEmail.mockResolvedValue(null);
    createUserService.create.mockRejectedValue(new Error("banco fora"));

    await expect(service.execute("credential")).rejects.toThrow("banco fora");
    expect(tokenService.issueFor).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-google#falha-do-colaborador-sem-efeito-parcial] se a emissão dos tokens falha, o login falha inteiro", async () => {
    tokenService.issueFor.mockRejectedValue(new Error("banco fora"));

    await expect(service.execute("credential")).rejects.toThrow("banco fora");
    expect(createUserService.create).not.toHaveBeenCalled();
  });
});
