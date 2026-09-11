import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { EmailVerificationService } from "./email-verification.service";
import { EmailVerificationTokenRepository } from "../repositories/email-verification-token.repository";
import {
  AuthErrorMessages,
  AuthVerificationMessages,
  EMAIL_VERIFICATION_TTL_HOURS,
} from "../constants/auth.constants";
import { buildUserEntity } from "../auth.fixtures";

describe("EmailVerificationService", () => {
  const tokens = {
    createToken: jest.fn(),
    findUsableToken: jest.fn(),
    markUsed: jest.fn(),
    invalidatePendingForUser: jest.fn(),
  };
  const notificationService = {
    sendEmailVerification: jest.fn(),
    appUrl: jest.fn(),
  };
  const getUsersService = { findByEmail: jest.fn() };
  const updateUserService = { markEmailVerified: jest.fn() };

  let service: EmailVerificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: EmailVerificationTokenRepository, useValue: tokens },
        { provide: NotificationService, useValue: notificationService },
        { provide: GetUsersService, useValue: getUsersService },
        { provide: UpdateUserService, useValue: updateUserService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(EmailVerificationService);

    tokens.createToken.mockResolvedValue(undefined);
    tokens.invalidatePendingForUser.mockResolvedValue(undefined);
    tokens.markUsed.mockResolvedValue(undefined);
    notificationService.appUrl.mockReturnValue("https://app.test");
    notificationService.sendEmailVerification.mockResolvedValue(undefined);
    updateUserService.markEmailVerified.mockResolvedValue(undefined);
  });

  describe("requestFor", () => {
    it("invalida os pendentes, grava um token novo e envia o link", async () => {
      const user = buildUserEntity({ emailVerifiedAt: null });

      const result = await service.requestFor(user);

      expect(tokens.invalidatePendingForUser).toHaveBeenCalledWith("user-id");
      expect(tokens.createToken).toHaveBeenCalledWith(
        "user-id",
        expect.any(String),
        expect.any(Date),
      );
      expect(notificationService.sendEmailVerification).toHaveBeenCalledWith(
        user.email,
        user.name,
        expect.stringContaining("https://app.test/verificar-email/"),
        EMAIL_VERIFICATION_TTL_HOURS,
      );
      expect(result).toEqual({
        verificationEmailSent: true,
        message: AuthVerificationMessages.SENT,
      });
    });

    it("não reenvia para quem já confirmou", async () => {
      const result = await service.requestFor(
        buildUserEntity({ emailVerifiedAt: new Date() }),
      );

      expect(result.verificationEmailSent).toBe(false);
      expect(tokens.createToken).not.toHaveBeenCalled();
      expect(notificationService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it("nunca lança: o cadastro não pode falhar porque o e-mail não saiu", async () => {
      notificationService.sendEmailVerification.mockRejectedValue(
        new Error("SMTP fora do ar"),
      );

      await expect(
        service.requestFor(buildUserEntity({ emailVerifiedAt: null })),
      ).resolves.toEqual({ verificationEmailSent: false });
    });

    it("emite um token diferente a cada pedido", async () => {
      const user = buildUserEntity({ emailVerifiedAt: null });

      await service.requestFor(user);
      await service.requestFor(user);

      const calls = tokens.createToken.mock.calls as Array<
        [string, string, Date]
      >;
      const [, first] = calls[0];
      const [, second] = calls[1];
      expect(second).not.toBe(first);
    });
  });

  describe("confirm", () => {
    it("marca o token usado e o e-mail confirmado", async () => {
      tokens.findUsableToken.mockResolvedValue({
        id: "token-row",
        userId: "user-id",
        user: buildUserEntity(),
      });

      await expect(service.confirm("token")).resolves.toEqual({
        verified: true,
        email: "maria@orfanatonib.test",
        message: AuthVerificationMessages.CONFIRMED,
      });

      expect(tokens.markUsed).toHaveBeenCalledWith(
        "token-row",
        expect.any(Date),
      );
      expect(updateUserService.markEmailVerified).toHaveBeenCalledWith(
        "user-id",
        expect.any(Date),
      );
    });

    it("recusa token inexistente, expirado ou já usado", async () => {
      tokens.findUsableToken.mockResolvedValue(null);

      await expect(service.confirm("lixo")).rejects.toThrow(
        new RuleException(AuthErrorMessages.VERIFICATION_TOKEN_INVALID),
      );
      expect(updateUserService.markEmailVerified).not.toHaveBeenCalled();
    });
  });

  describe("resend", () => {
    it("reenvia para quem existe e ainda não confirmou", async () => {
      getUsersService.findByEmail.mockResolvedValue(
        buildUserEntity({ emailVerifiedAt: null }),
      );

      await service.resend("maria@orfanatonib.test");

      expect(notificationService.sendEmailVerification).toHaveBeenCalledTimes(
        1,
      );
    });

    it.each([
      ["e-mail sem conta", null],
      ["conta já confirmada", buildUserEntity({ emailVerifiedAt: new Date() })],
    ])("responde igual para %s, sem enviar nada", async (_label, user) => {
      getUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.resend("qualquer@orfanatonib.test"),
      ).resolves.toEqual({
        verificationEmailSent: true,
        message: AuthVerificationMessages.RESEND_ACCEPTED,
      });
      expect(notificationService.sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe("statusFor", () => {
    it("informa a pendência de quem não confirmou", () => {
      expect(
        service.statusFor(buildUserEntity({ emailVerifiedAt: null })),
      ).toEqual({
        verificationEmailSent: false,
        message: AuthVerificationMessages.SENT,
      });
    });

    it("não informa nada para quem já confirmou", () => {
      expect(
        service.statusFor(buildUserEntity({ emailVerifiedAt: new Date() })),
      ).toBeUndefined();
    });
  });
});
