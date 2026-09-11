import { UserRole } from "../auth.types";
import { EmailVerificationStatusDto } from "./email-verification.response.dto";

/** Usuário devolvido por login e registro. Nunca carrega hash nem refresh. */
export class AuthUserDto {
  id!: string;
  email!: string;
  name!: string;
  active!: boolean;
  completed!: boolean;
  commonUser!: boolean;
  phone!: string;
  role!: UserRole;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AuthTokensDto {
  accessToken!: string;
  refreshToken!: string;
}

export class MessageResponseDto {
  message!: string;
}

/** Login de usuário ativo: mensagem, usuário e o par de tokens. */
export class LoginResponseDto extends AuthTokensDto {
  message!: string;
  user!: AuthUserDto;
  /** Presente só enquanto o e-mail não foi confirmado. */
  emailVerification?: EmailVerificationStatusDto;
}

/**
 * Login de usuário inativo. Responde 200 com o usuário e sem tokens — é o que
 * a tela de login lê para mostrar "cadastro ainda não validado".
 */
export class InactiveLoginResponseDto {
  message!: string;
  user!: AuthUserDto;
  emailVerification?: EmailVerificationStatusDto;
}

export type LoginResult = LoginResponseDto | InactiveLoginResponseDto;

/** Google, primeiro acesso ou cadastro ainda incompleto. */
export class GooglePendingRegistrationDto {
  email!: string;
  name!: string;
  completed!: boolean;
  commonUser!: boolean;
  newUser!: boolean;
}

/** Google, conta completa mas inativa. */
export class GoogleInactiveUserDto {
  message!: string;
  active!: false;
  completed!: boolean;
  commonUser!: boolean;
  newUser!: false;
}

/** Google, conta completa e ativa. */
export class GoogleLoginResponseDto extends AuthTokensDto {
  message!: string;
  isNewUser!: false;
  user!: AuthUserDto;
}

export type GoogleLoginResult =
  | GooglePendingRegistrationDto
  | GoogleInactiveUserDto
  | GoogleLoginResponseDto;

export class RegisterResponseDto {
  message!: string;
  user!: AuthUserDto;
  emailVerification?: EmailVerificationStatusDto;
}
