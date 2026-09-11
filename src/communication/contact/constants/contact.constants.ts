export const ContactMessages = {
    CREATED_SUCCESS: 'Contato criado com sucesso.',
    SAVE_ERROR: 'Error saving contact',
    FETCH_ERROR: 'Error fetching contacts',
    UPDATE_ERROR: 'Error updating contact',
    DELETE_ERROR: 'Error deleting contact',
    NOT_FOUND: 'Contact not found',
    EMAIL_SENT: 'Contact email sent successfully',
    WHATSAPP_SENT: 'Contact WhatsApp notification sent',
} as const;

export const ContactNotificationLogs = {
    SAVE_ERROR: (error: string) => `Erro ao salvar contato: ${error}`,
    NOTIFICATION_ERROR: (error: string) => `Erro ao enviar notificações de contato: ${error}`,
    FETCH_ERROR: 'Erro ao buscar contatos',
    UPDATE_ERROR: (id: string) => `Erro ao atualizar contato ID=${id}`,
    DELETE_ERROR: (id: string) => `Erro ao deletar contato ID=${id}`,
    EMAIL_SUCCESS: 'Email de contato enviado com sucesso',
    EMAIL_ERROR: 'Erro ao enviar email de contato',
    WHATSAPP_SUCCESS: 'Notificação de WhatsApp de contato enviada',
    WHATSAPP_ERROR: (error: string) => `Erro ao enviar WhatsApp de contato: ${error}`,
    WHATSAPP_CONFIG_MISSING: 'Configuração de WhatsApp ausente, pulando notificação de WhatsApp',
} as const;
