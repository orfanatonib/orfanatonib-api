export enum PasswordRecoveryStatus {
    RESET_LINK_SENT = 'RESET_LINK_SENT',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
}

export const PasswordRecoveryMessages = {
    RESET_LINK_SENT: 'Email de recuperação de senha enviado com sucesso.',
    USER_NOT_FOUND: 'Email não encontrado na base de dados.',
    TOKEN_INVALID: 'Token inválido ou expirado.',
    PASSWORD_CHANGED: 'Senha alterada com sucesso.',
} as const;
