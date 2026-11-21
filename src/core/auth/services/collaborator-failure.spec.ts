import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthenticatedException } from "src/common/exceptions";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { UpdateMemberProfileService } from "src/shelter/member-profile/services/update-member-profile.service";
import {
  buildCompleteRegisterDto,
  buildRegisterDto,
  buildUserEntity,
} from "../auth.fixtures";
import { EmailVerificationTokenRepository } from "../repositories/email-verification-token.repository";
import { PasswordResetTokenRepository } from "../repositories/password-reset-token.repository";
import { AuthTokenService } from "./auth-token.service";
import { EmailVerificationService } from "./email-verification.service";
import { LoginService } from "./login.service";
import { CompletionTokenService } from "./completion-token.service";
import { PasswordRecoveryService } from "./password-recovery.service";
import { RegisterService } from "./register.service";

/**
 * Falha de colaborador sem efeito parcial (matriz do plano 06): quando uma
 * dependência cai no meio do caso de uso, o que já foi gravado não deixa o
 * sistema num estado que o usuário não consegue sair, e nada é devolvido como sucesso.
 * (`/auth/google` está em `google-login.service.spec.ts`, que já mocka a biblioteca do Google.)
 */
describe("Falha de colaborador nos casos de uso de autenticação", () => {
  const boom = new Error("colaborador fora do ar");

  const getUsers = { findByEmail: jest.fn(), findByIdOrNull: jest.fn() };
  const createUser = { create: jest.fn() };
  const updateUser = {
    update: jest.fn(),
    setRefreshToken: jest.fn(),
    markEmailVerified: jest.fn(),
  };
  const updateMember = { assignTeamForUser: jest.fn() };
  const notification = {
    sendEmailVerification: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
    appUrl: () => "http://localhost:5173",
  };
  const verificationTokens = {
    createToken: jest.fn(),
    findUsableToken: jest.fn(),
    markUsed: jest.fn(),
    invalidatePendingForUser: jest.fn(),
  };
  const resetTokens = {
    createToken: jest.fn(),
    findValidToken: jest.fn(),
    deleteToken: jest.fn(),
    invalidateTokensForUser: jest.fn(),
  };
  const completion = { verify: jest.fn() };
  const jwt = { sign: jest.fn(), verify: jest.fn() };
  const config = { getOrThrow: jest.fn() };

  const asType = <T>(value: unknown): T => value as T;

  const tokenService = () =>
    new AuthTokenService(
      asType<JwtService>(jwt),
      asType<ConfigService>(config),
      asType<GetUsersService>(getUsers),
      asType<UpdateUserService>(updateUser),
    );
  const verification = () =>
    new EmailVerificationService(
      asType<EmailVerificationTokenRepository>(verificationTokens),
      asType<NotificationService>(notification),
      asType<GetUsersService>(getUsers),
      asType<UpdateUserService>(updateUser),
    );
  const register = (ev: EmailVerificationService = verification()) =>
    new RegisterService(
      asType<GetUsersService>(getUsers),
      asType<CreateUserService>(createUser),
      asType<UpdateUserService>(updateUser),
      asType<UpdateMemberProfileService>(updateMember),
      ev,
      asType<CompletionTokenService>(completion),
    );
  const recovery = () =>
    new PasswordRecoveryService(
      asType<GetUsersService>(getUsers),
      asType<UpdateUserService>(updateUser),
      asType<NotificationService>(notification),
      asType<PasswordResetTokenRepository>(resetTokens),
    );

  const user = buildUserEntity({ emailVerifiedAt: null });

  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockReturnValue("1d");
    jwt.sign.mockReturnValue("signed");
    getUsers.findByEmail.mockResolvedValue(user);
    getUsers.findByIdOrNull.mockResolvedValue(user);
    completion.verify.mockReturnValue(user.id);
    createUser.create.mockResolvedValue(user);
    updateUser.update.mockResolvedValue(user);
    updateUser.setRefreshToken.mockResolvedValue(undefined);
    updateUser.markEmailVerified.mockResolvedValue(undefined);
    updateMember.assignTeamForUser.mockResolvedValue(undefined);
    notification.sendEmailVerification.mockResolvedValue(undefined);
    notification.sendPasswordResetEmail.mockResolvedValue(undefined);
    notification.sendPasswordChangedEmail.mockResolvedValue(undefined);
    verificationTokens.createToken.mockResolvedValue(undefined);
    verificationTokens.markUsed.mockResolvedValue(undefined);
    verificationTokens.invalidatePendingForUser.mockResolvedValue(undefined);
    resetTokens.createToken.mockResolvedValue(undefined);
    resetTokens.deleteToken.mockResolvedValue(undefined);
    resetTokens.invalidateTokensForUser.mockResolvedValue(undefined);
  });

  it("[auth.post.auth-login#falha-do-colaborador-sem-efeito-parcial] se gravar o refresh token falha, o login falha e nenhum token é entregue", async () => {
    updateUser.setRefreshToken.mockRejectedValue(boom);
    const login = new LoginService(
      asType<GetUsersService>(getUsers),
      tokenService(),
      verification(),
    );
    getUsers.findByEmail.mockResolvedValue(
      buildUserEntity({ password: bcrypt.hashSync("Aa1!aaaaaa", 4) }),
    );

    await expect(
      login.execute({ email: user.email, password: "Aa1!aaaaaa" }),
    ).rejects.toThrow(boom);
    expect(updateUser.setRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("[auth.post.auth-refresh#falha-do-colaborador-sem-efeito-parcial] se gravar o novo refresh falha, a renovação falha e o token antigo não é trocado por resposta de sucesso", async () => {
    jwt.verify.mockReturnValue({ sub: user.id });
    getUsers.findByIdOrNull.mockResolvedValue(
      buildUserEntity({ refreshToken: "antigo" }),
    );
    updateUser.setRefreshToken.mockRejectedValue(boom);

    await expect(tokenService().refresh("antigo")).rejects.toThrow(boom);
  });

  it("[auth.post.auth-logout#falha-do-colaborador-sem-efeito-parcial] se limpar o refresh falha, o logout não responde sucesso", async () => {
    updateUser.setRefreshToken.mockRejectedValue(boom);

    await expect(tokenService().logout(user.id)).rejects.toThrow(boom);
  });

  it("[auth.post.auth-register#falha-do-colaborador-sem-efeito-parcial] se criar a conta falha, nenhum token de verificação nem e-mail é gerado", async () => {
    getUsers.findByEmail.mockResolvedValue(null);
    createUser.create.mockRejectedValue(boom);

    await expect(register().register(buildRegisterDto())).rejects.toThrow(boom);
    expect(verificationTokens.createToken).not.toHaveBeenCalled();
    expect(notification.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-register#falha-do-colaborador-sem-efeito-parcial] se o e-mail de verificação não sai, a conta continua criada e a resposta diz que o envio não foi aceito", async () => {
    getUsers.findByEmail.mockResolvedValue(null);
    notification.sendEmailVerification.mockRejectedValue(boom);

    const result = await register().register(buildRegisterDto());

    expect(createUser.create).toHaveBeenCalledTimes(1);
    expect(result.emailVerification).toMatchObject({
      verificationEmailSent: false,
    });
  });

  it("[auth.post.auth-complete-register#falha-do-colaborador-sem-efeito-parcial] se atualizar a conta falha, não atribui equipe nem gera verificação", async () => {
    getUsers.findByIdOrNull.mockResolvedValue(
      buildUserEntity({ completed: false }),
    );
    updateUser.update.mockRejectedValue(boom);

    await expect(
      register().completeRegister(buildCompleteRegisterDto()),
    ).rejects.toThrow(boom);
    expect(updateMember.assignTeamForUser).not.toHaveBeenCalled();
    expect(verificationTokens.createToken).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-complete-register#falha-do-colaborador-sem-efeito-parcial] conta inexistente: 401 genérico sem nenhuma escrita", async () => {
    getUsers.findByIdOrNull.mockResolvedValue(null);

    await expect(
      register().completeRegister(buildCompleteRegisterDto()),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
    expect(updateUser.update).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-verify-email#falha-do-colaborador-sem-efeito-parcial] se confirmar o e-mail falha, o token NÃO é gasto (o usuário pode tentar de novo)", async () => {
    verificationTokens.findUsableToken.mockResolvedValue({
      id: "t1",
      userId: user.id,
      user,
    });
    updateUser.markEmailVerified.mockRejectedValue(boom);

    await expect(verification().confirm("tok")).rejects.toThrow(boom);
    expect(verificationTokens.markUsed).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-resend-verification#falha-do-colaborador-sem-efeito-parcial] se o e-mail não sai, a resposta continua idêntica à de e-mail inexistente (sem vazar nem falhar)", async () => {
    notification.sendEmailVerification.mockRejectedValue(boom);
    const withFailure = await verification().resend(user.email);

    getUsers.findByEmail.mockResolvedValue(null);
    const unknownEmail = await verification().resend(
      "nao.existe@orfanatonib.test",
    );

    expect(withFailure).toEqual(unknownEmail);
  });

  it("[auth.post.auth-forgot-password#falha-do-colaborador-sem-efeito-parcial] se o e-mail não pode ser enfileirado, a resposta HTTP segue idêntica (o envio roda em segundo plano) e a falha só é registrada", async () => {
    notification.sendPasswordResetEmail.mockRejectedValue(boom);

    const service = recovery();
    await expect(
      service.forgotPassword({ email: user.email }),
    ).resolves.toMatchObject({ status: "RESET_LINK_SENT" });
    await expect(service.deliverResetLink(user.email)).resolves.toBeUndefined();
  });

  it("[auth.post.auth-reset-password#falha-do-colaborador-sem-efeito-parcial] se trocar a senha falha, o token NÃO é apagado (continua válido para nova tentativa)", async () => {
    resetTokens.findValidToken.mockResolvedValue({ user });
    updateUser.update.mockRejectedValue(boom);

    await expect(
      recovery().resetPassword({ token: "tok", newPassword: "Aa1!aaaaaa" }),
    ).rejects.toThrow(boom);
    expect(resetTokens.deleteToken).not.toHaveBeenCalled();
  });

  it("[auth.post.auth-reset-password#falha-do-colaborador-sem-efeito-parcial] se só o aviso 'senha alterada' falha, a senha já mudou e o reset responde sucesso", async () => {
    resetTokens.findValidToken.mockResolvedValue({ user });
    notification.sendPasswordChangedEmail.mockRejectedValue(boom);

    const result = await recovery().resetPassword({
      token: "tok",
      newPassword: "Aa1!aaaaaa",
    });

    expect(result.message).toBeTruthy();
    expect(resetTokens.deleteToken).toHaveBeenCalledWith("tok");
  });
});
