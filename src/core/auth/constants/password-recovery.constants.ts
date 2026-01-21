/**
 * Password Recovery Status Codes
 */
export enum PasswordRecoveryStatus {
    RESET_LINK_SENT = 'RESET_LINK_SENT',
    SES_NOT_VERIFIED = 'SES_NOT_VERIFIED',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
}

/**
 * Password Recovery Error Messages
 */
export const PasswordRecoveryMessages = {
    RESET_LINK_SENT: 'Email de recuperação de senha enviado com sucesso.',
    SES_NOT_VERIFIED: 'Seu email ainda não foi verificado. Um email de verificação foi enviado.',
    USER_NOT_FOUND: 'Email não encontrado na base de dados.',
    TOKEN_INVALID: 'Token inválido ou expirado.',
    PASSWORD_CHANGED: 'Senha alterada com sucesso.',
} as const;

/**
 * Password Recovery Response Types
 */
export interface PasswordRecoveryResponse {
    status: PasswordRecoveryStatus;
    message: string;
    verificationEmailSent?: boolean;
}
