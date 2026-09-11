import { Test } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthenticatedRequest, UserRole } from "./auth.types";
import { LoginService } from "./services/login.service";
import { GoogleLoginService } from "./services/google-login.service";
import { AuthTokenService } from "./services/auth-token.service";
import { RegisterService } from "./services/register.service";
import { GetMeService } from "./services/get-me.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { PasswordRecoveryService } from "./services/password-recovery.service";
import { PasswordRecoveryStatus } from "./constants/password-recovery.constants";
import {
  buildCompleteRegisterDto,
  buildLoginDto,
  buildRegisterDto,
  buildTokens,
} from "./auth.fixtures";

describe("AuthController", () => {
  const loginService = { execute: jest.fn() };
  const googleLoginService = { execute: jest.fn() };
  const tokenService = { refresh: jest.fn(), logout: jest.fn() };
  const registerService = { register: jest.fn(), completeRegister: jest.fn() };
  const getMeService = { execute: jest.fn() };
  const emailVerificationService = { confirm: jest.fn(), resend: jest.fn() };
  const passwordRecoveryService = {
    forgotPassword: jest.fn(),
    validateResetToken: jest.fn(),
    resetPassword: jest.fn(),
  };

  const request = {
    user: { userId: "user-id", role: UserRole.ADMIN },
  } as AuthenticatedRequest;

  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginService, useValue: loginService },
        { provide: GoogleLoginService, useValue: googleLoginService },
        { provide: AuthTokenService, useValue: tokenService },
        { provide: RegisterService, useValue: registerService },
        { provide: GetMeService, useValue: getMeService },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationService,
        },
        { provide: PasswordRecoveryService, useValue: passwordRecoveryService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    controller = moduleRef.get(AuthController);

    loginService.execute.mockResolvedValue({ message: "ok" });
    googleLoginService.execute.mockResolvedValue({ newUser: true });
    tokenService.refresh.mockResolvedValue(buildTokens());
    tokenService.logout.mockResolvedValue({ message: "User logged out" });
    registerService.register.mockResolvedValue({ message: "ok" });
    registerService.completeRegister.mockResolvedValue({ message: "ok" });
    getMeService.execute.mockResolvedValue({ id: "user-id" });
    emailVerificationService.confirm.mockResolvedValue({
      verified: true,
      email: "maria@orfanatonib.test",
      message: "E-mail confirmado com sucesso.",
    });
    emailVerificationService.resend.mockResolvedValue({
      verificationEmailSent: true,
    });
    passwordRecoveryService.forgotPassword.mockResolvedValue({
      status: PasswordRecoveryStatus.RESET_LINK_SENT,
      message: "enviado",
    });
    passwordRecoveryService.validateResetToken.mockResolvedValue({
      valid: true,
      email: "maria@orfanatonib.test",
    });
    passwordRecoveryService.resetPassword.mockResolvedValue({
      message: "alterada",
    });
  });

  it("login forwards the credentials to the use case", async () => {
    const dto = buildLoginDto();

    await controller.login(dto);

    expect(loginService.execute).toHaveBeenCalledWith(dto);
  });

  it("google forwards only the credential of the payload", async () => {
    await controller.googleLogin({ token: "google-credential" });

    expect(googleLoginService.execute).toHaveBeenCalledWith(
      "google-credential",
    );
  });

  it("google tolerates a body with no credential", async () => {
    await controller.googleLogin({});

    expect(googleLoginService.execute).toHaveBeenCalledWith(undefined);
  });

  it("refresh forwards the token of the payload", async () => {
    await expect(
      controller.refresh({ refreshToken: "guardado" }),
    ).resolves.toEqual(buildTokens());

    expect(tokenService.refresh).toHaveBeenCalledWith("guardado");
  });

  it("refresh forwards undefined when the body is empty", async () => {
    await controller.refresh({});

    expect(tokenService.refresh).toHaveBeenCalledWith(undefined);
  });

  it("logout and me read the actor from the token, not from the body", async () => {
    await controller.logout(request);
    await controller.getMe(request);

    expect(tokenService.logout).toHaveBeenCalledWith("user-id");
    expect(getMeService.execute).toHaveBeenCalledWith("user-id");
  });

  it("register and complete-register forward the validated payload", async () => {
    const register = buildRegisterDto();
    const complete = buildCompleteRegisterDto();

    await controller.register(register);
    await controller.completeRegister(complete);

    expect(registerService.register).toHaveBeenCalledWith(register);
    expect(registerService.completeRegister).toHaveBeenCalledWith(complete);
  });

  it("forgot-password forwards the email", async () => {
    await controller.forgotPassword({ email: "maria@orfanatonib.test" });

    expect(passwordRecoveryService.forgotPassword).toHaveBeenCalledWith({
      email: "maria@orfanatonib.test",
    });
  });

  it("validate reads the token from the query string", async () => {
    await expect(controller.validateResetToken("reset-token")).resolves.toEqual(
      { valid: true, email: "maria@orfanatonib.test" },
    );

    expect(passwordRecoveryService.validateResetToken).toHaveBeenCalledWith(
      "reset-token",
    );
  });

  it("reset-password forwards the token and the new password", async () => {
    const dto = { token: "reset-token", newPassword: "Nova@12345" };

    await controller.resetPassword(dto);

    expect(passwordRecoveryService.resetPassword).toHaveBeenCalledWith(dto);
  });
});
