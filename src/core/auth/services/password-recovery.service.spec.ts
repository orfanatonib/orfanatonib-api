import { Test } from "@nestjs/testing";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetUsersService } from "../../user/services/get-user.service";
import { UpdateUserService } from "../../user/services/update-user.service";
import { PasswordRecoveryStatus } from "../constants/password-recovery.constants";
import { PasswordResetTokenRepository } from "../repositories/password-reset-token.repository";
import { PasswordRecoveryService } from "./password-recovery.service";

describe("PasswordRecoveryService", () => {
  const user = {
    id: "user-id",
    email: "user@example.com",
    name: "Maria",
    completed: true,
  };
  const findByEmail = jest.fn<Promise<typeof user | undefined>, [string]>();
  const update = jest.fn<Promise<void>, [string, { password: string }]>();
  const sendPasswordResetEmail = jest.fn<
    Promise<void>,
    [string, string, string]
  >();
  const sendPasswordChangedEmail = jest.fn<Promise<void>, [string, string]>();
  const invalidateTokensForUser = jest.fn<Promise<void>, [string]>();
  const createToken = jest.fn<
    Promise<{ id: string }>,
    [string, string, Date]
  >();
  const findValidToken = jest.fn<
    Promise<{ user: typeof user } | null>,
    [string]
  >();
  const deleteToken = jest.fn<Promise<void>, [string]>();
  let service: PasswordRecoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    findByEmail.mockResolvedValue(user);
    update.mockResolvedValue(undefined);
    sendPasswordResetEmail.mockResolvedValue(undefined);
    sendPasswordChangedEmail.mockResolvedValue(undefined);
    invalidateTokensForUser.mockResolvedValue(undefined);
    createToken.mockResolvedValue({ id: "token-id" });
    findValidToken.mockResolvedValue(null);
    deleteToken.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: GetUsersService, useValue: { findByEmail } },
        { provide: UpdateUserService, useValue: { update } },
        {
          provide: NotificationService,
          useValue: {
            sendPasswordResetEmail,
            sendPasswordChangedEmail,
            appUrl: () => "http://localhost:5173",
          },
        },
        {
          provide: PasswordResetTokenRepository,
          useValue: {
            invalidateTokensForUser,
            createToken,
            findValidToken,
            deleteToken,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PasswordRecoveryService);
  });

  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

  it("creates a reset token and sends it for an existing complete account (in the background)", async () => {
    const result = await service.forgotPassword({ email: user.email });
    await flush();

    expect(invalidateTokensForUser).toHaveBeenCalledWith(user.id);
    expect(createToken).toHaveBeenCalledTimes(1);
    const createTokenCall = createToken.mock.calls[0];
    expect(createTokenCall?.[0]).toBe(user.id);
    expect(typeof createTokenCall?.[1]).toBe("string");
    expect(createTokenCall?.[2]).toBeInstanceOf(Date);
    // O serviço monta o link do frontend e informa a validade.
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      user.email,
      user.name,
      `http://localhost:5173/recuperar-senha/${createTokenCall?.[1]}`,
      30,
    );
    expect(result.status).toBe(PasswordRecoveryStatus.RESET_LINK_SENT);
  });

  it("[auth.post.auth-forgot-password#resposta-identica] answers exactly the same for an existing and an unknown email, and sends nothing for the unknown one", async () => {
    const existing = await service.forgotPassword({ email: user.email });
    await flush();
    sendPasswordResetEmail.mockClear();
    createToken.mockClear();

    findByEmail.mockResolvedValue(undefined);
    const unknown = await service.forgotPassword({
      email: "missing@example.com",
    });
    await flush();

    expect(unknown).toEqual(existing);
    expect(createToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-forgot-password#resposta-identica] does not wait for the lookup or the e-mail before answering", async () => {
    findByEmail.mockReturnValue(new Promise(() => undefined));

    await expect(
      service.forgotPassword({ email: user.email }),
    ).resolves.toMatchObject({
      status: PasswordRecoveryStatus.RESET_LINK_SENT,
    });
  });

  it("[auth.post.auth-forgot-password#resposta-identica] skips a pending Google account (not completed) silently", async () => {
    findByEmail.mockResolvedValue({ ...user, completed: false });

    await service.forgotPassword({ email: user.email });
    await flush();

    expect(createToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("validates an active reset token", async () => {
    findValidToken.mockResolvedValueOnce({ user });

    await expect(service.validateResetToken("reset-token")).resolves.toEqual({
      valid: true,
      email: user.email,
    });
  });

  it("rejects an invalid reset token", async () => {
    await expect(
      service.validateResetToken("invalid-token"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("updates the password, removes the token and sends a confirmation", async () => {
    findValidToken.mockResolvedValueOnce({ user });

    await expect(
      service.resetPassword({
        token: "reset-token",
        newPassword: "new-password",
      }),
    ).resolves.toEqual({ message: "Senha alterada com sucesso." });
    expect(update).toHaveBeenCalledWith(user.id, {
      password: "new-password",
    });
    expect(deleteToken).toHaveBeenCalledWith("reset-token");
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith(
      user.email,
      user.name,
    );
  });

  it("rejects a password change with an invalid token", async () => {
    await expect(
      service.resetPassword({
        token: "invalid-token",
        newPassword: "new-password",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });
});
