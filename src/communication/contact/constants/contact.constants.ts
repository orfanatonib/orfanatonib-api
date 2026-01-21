export const ContactMessages = {
    CREATED_SUCCESS: 'Contato criado com sucesso.',
    SAVE_ERROR: 'Error saving contact',
    FETCH_ERROR: 'Error fetching contacts',
    UPDATE_ERROR: 'Error updating contact',
    DELETE_ERROR: 'Error deleting contact',
    NOT_FOUND: 'Contact not found',
    EMAIL_SENT: 'Contact email sent successfully',
    EMAIL_SKIPPED_SES: 'SES identity not verified, skipping email',
    WHATSAPP_SENT: 'Contact WhatsApp notification sent',
} as const;

export const ContactNotificationLogs = {
    SAVE_ERROR: (error: string) => `Erro ao salvar contato: ${error}`,
    NOTIFICATION_ERROR: (error: string) => `Erro ao enviar notificações de contato: ${error}`,
    FETCH_ERROR: 'Erro ao buscar contatos',
    UPDATE_ERROR: (id: string) => `Erro ao atualizar contato ID=${id}`,
    DELETE_ERROR: (id: string) => `Erro ao deletar contato ID=${id}`,
    EMAIL_SUCCESS: (email: string) => `Email de contato enviado com sucesso para: ${email}`,
    EMAIL_SES_NOT_VERIFIED: (email: string, verificationSent: boolean) =>
        `Identidade SES não verificada para ${email}. Email de verificação enviado: ${verificationSent}. Pulando email de contato para este destinatário.`,
    EMAIL_ERROR: (email: string, error: string) => `Erro ao enviar email de contato para ${email}: ${error}`,
    WHATSAPP_SUCCESS: 'Notificação de WhatsApp de contato enviada',
    WHATSAPP_ERROR: (error: string) => `Erro ao enviar WhatsApp de contato: ${error}`,
    SES_DEFAULT_TO_MISSING: 'SES_DEFAULT_TO não configurado, pulando envio de email de contato',
    NO_VALID_EMAILS: 'Nenhum endereço de email válido em SES_DEFAULT_TO',
    WHATSAPP_CONFIG_MISSING: 'Configuração de WhatsApp ausente, pulando notificação de WhatsApp',
} as const;
