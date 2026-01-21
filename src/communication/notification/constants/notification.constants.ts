export const NotificationLogs = {
    PASSWORD_RESET_SENT: (email: string) => `Password reset email sent to: ${email}`,
    PASSWORD_RESET_ERROR: (error: string) => `Error sending password reset email: ${error}`,
    PASSWORD_CHANGED_SENT: (email: string) => `Password changed email sent to: ${email}`,
    PASSWORD_CHANGED_ERROR: (error: string) => `Error sending password changed email: ${error}`,
    CONTACT_EMAIL_SENT: (email: string) => `Contact email sent successfully to: ${email}`,
    CONTACT_EMAIL_SES_NOT_VERIFIED: (email: string, verificationSent: boolean) =>
        `SES identity not verified for ${email}. Verification email sent: ${verificationSent}. Skipping contact email to this recipient.`,
    CONTACT_EMAIL_ERROR: (email: string, error: string) => `Error sending contact email to ${email}: ${error}`,
    CONTACT_WHATSAPP_SENT: 'Contact WhatsApp notification sent',
    CONTACT_WHATSAPP_ERROR: (error: string) => `Error sending contact WhatsApp: ${error}`,
    SES_DEFAULT_TO_MISSING: 'SES_DEFAULT_TO not configured, skipping contact email send',
    NO_VALID_EMAILS: 'No valid email addresses in SES_DEFAULT_TO',
    WHATSAPP_CONFIG_MISSING: 'WhatsApp configuration missing, skipping WhatsApp notification',
} as const;
