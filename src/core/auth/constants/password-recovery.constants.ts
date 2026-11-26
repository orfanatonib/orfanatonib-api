export enum PasswordRecoveryStatus {
  RESET_LINK_SENT = "RESET_LINK_SENT",
}

export const PasswordRecoveryMessages = {
  /** Resposta única do `forgot-password`, exista o e-mail ou não. */
  RESET_LINK_SENT:
    "Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.",
  TOKEN_INVALID: "Token inválido ou expirado.",
  PASSWORD_CHANGED: "Senha alterada com sucesso.",
} as const;
