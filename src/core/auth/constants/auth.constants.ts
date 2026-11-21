import { MediaTargetType } from "src/shared/media/media-target-type.enum";

export enum AuthStatus {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
  REGISTRATION_SUCCESS = "REGISTRATION_SUCCESS",
  USER_INACTIVE = "USER_INACTIVE",
}

/** A foto de perfil vive em `media_items`, referenciada por `targetId`. */
export const AUTH_USER_MEDIA_TARGET = MediaTargetType.User;

/** Onde o token pode chegar, além do header `Authorization`. */
export const AUTH_TOKEN_COOKIE_KEYS = ["access_token", "auth_token"] as const;
export const AUTH_TOKEN_QUERY_KEY = "access_token";
export const AUTH_BEARER_SCHEME = "bearer";

/** Janela de validade do token de recuperação de senha. */
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const PASSWORD_RESET_TOKEN_BYTES = 32;

/** Confirmação de e-mail: validade mais longa, é um clique único e sem pressa. */
export const EMAIL_VERIFICATION_TTL_HOURS = 24;
export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
/** Rota do frontend que recebe o token do link. */
export const EMAIL_VERIFICATION_PATH = "verificar-email";

/**
 * Token de conclusão do cadastro Google: prova de posse da identidade Google,
 * emitido só depois de o Google ter validado o `idToken`. Curto e com propósito
 * próprio; não é o JWT de sessão.
 */
export const COMPLETION_TOKEN_TTL_MINUTES = 15;
export const COMPLETION_TOKEN_PURPOSE = "complete_register";

/**
 * Trechos que a `google-auth-library` devolve na mensagem de erro. Não há
 * código de erro tipado na biblioteca, então a classificação é por texto.
 */
export const GOOGLE_EXPIRED_TOKEN_HINTS = [
  "Token used too late",
  "expired",
] as const;
export const GOOGLE_INVALID_TOKEN_HINTS = ["Invalid token"] as const;

export const AuthErrorMessages = {
  INVALID_CREDENTIALS: "Invalid credentials",
  USER_NOT_FOUND: "User not found",
  USER_INACTIVE: "User is inactive",
  USER_ALREADY_EXISTS: "User already exists",
  USER_ALREADY_COMPLETED: "User already completed registration",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  REFRESH_TOKEN_REQUIRED: "Refresh token is required",
  INVALID_GOOGLE_TOKEN: "Invalid Google token payload",
  GOOGLE_TOKEN_EXPIRED:
    "Google authentication token has expired. Please try signing in again.",
  GOOGLE_TOKEN_INVALID:
    "Invalid Google authentication token. Please try signing in again.",
  GOOGLE_AUTH_FAILED:
    "Google authentication failed. Please try signing in with Google again.",
  TOKEN_MISSING: "Token missing",
  JWT_SECRET_MISSING: "JWT secret not configured",
  NOT_AUTHENTICATED: "User not authenticated",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  ADMIN_ONLY: "Access restricted to administrators",
  ADMIN_OR_LEADER_ONLY: "Access restricted to administrators and leaders",
  VERIFICATION_TOKEN_INVALID: "Link de confirmação inválido ou expirado.",
  EMAIL_ALREADY_VERIFIED: "Este e-mail já foi confirmado.",
  /** Única resposta de `complete-register` para qualquer token recusado. */
  COMPLETION_TOKEN_INVALID:
    "Sessão de cadastro inválida ou expirada. Entre com o Google novamente.",
} as const;

export const AuthVerificationMessages = {
  SENT: "Enviamos um link de confirmação para o seu e-mail.",
  ALREADY_VERIFIED: "Este e-mail já está confirmado.",
  CONFIRMED: "E-mail confirmado com sucesso.",
  /** Resposta do reenvio: a mesma para e-mail existente ou não. */
  RESEND_ACCEPTED:
    "Se houver uma conta com este e-mail pendente de confirmação, enviamos um novo link.",
} as const;

export const AuthSuccessMessages = {
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "User logged out",
  REGISTRATION_SUCCESS: "Registration successful",
  REGISTRATION_COMPLETED: "Registration completed successfully",
  USER_INACTIVE: "User is inactive.",
} as const;

export const AuthLogs = {
  LOGIN_ATTEMPT: "User login attempt",
  LOGIN_SUCCESS: "User logged in successfully",
  GOOGLE_LOGIN_ATTEMPT: "Google login attempt",
  GOOGLE_LOGIN_SUCCESS: "Google login successful",
  GOOGLE_LOGIN_ERROR: (error: string) => `Error during Google login: ${error}`,
  TOKEN_REFRESH_ATTEMPT: "Token refresh attempt",
  TOKEN_REFRESH_SUCCESS: "Token refreshed successfully",
  LOGOUT: (userId: string) => `User logging out: ${userId}`,
  LOGOUT_SUCCESS: (userId: string) => `User logged out successfully: ${userId}`,
  REGISTRATION_ATTEMPT: "Creating new user registration",
  REGISTRATION_SUCCESS: "User registered successfully",
  COMPLETE_REGISTRATION_ATTEMPT: "Completing user registration",
  COMPLETE_REGISTRATION_SUCCESS: "User registration completed successfully",
  TEAM_ASSIGN_FAILED: (userId: string, reason: string) =>
    `Failed to assign team for user ${userId}: ${reason}`,
  MISSING_ROLE_IN_TOKEN: (userId: string) =>
    `Missing role in JWT payload (userId: ${userId})`,
  VERIFICATION_SENT: (userId: string) =>
    `Verification email queued for user ${userId}`,
  VERIFICATION_SEND_FAILED: (userId: string, reason: string) =>
    `Failed to queue verification email for user ${userId}: ${reason}`,
  PASSWORD_CHANGED_EMAIL_FAILED: (userId: string, reason: string) =>
    `Failed to queue password-changed email for user ${userId}: ${reason}`,
  COMPLETION_TOKEN_REJECTED: (reason: string) =>
    `complete-register rejected: ${reason}`,
  PASSWORD_RECOVERY_FAILED: (reason: string) =>
    `Failed to process password recovery request: ${reason}`,
  VERIFICATION_CONFIRMED: (userId: string) =>
    `Email verified for user ${userId}`,
} as const;
