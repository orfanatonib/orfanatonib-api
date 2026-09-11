export const NOTIFICATION_CONFIG = {
  EMAIL_SEND_INTERVAL_MS: 200,
  LOCAL_ENVIRONMENT: 'local',
  STAGING_ENVIRONMENT: 'staging',
  PRODUCTION_ENVIRONMENTS: ['prod', 'production'] as readonly string[],
  LOCAL_BASE_URL: 'http://localhost:5173',
  STAGING_BASE_URL: 'https://staging.orfanatonib.com',
  PRODUCTION_BASE_URL: 'https://www.orfanatonib.com',
} as const;

export const NotificationLogs = {
  PASSWORD_RESET_SENT: 'Password reset email sent',
  PASSWORD_RESET_ERROR: 'Error sending password reset email',
  PASSWORD_CHANGED_SENT: 'Password changed email sent',
  PASSWORD_CHANGED_ERROR: 'Error sending password changed email',
  CONTACT_EMAIL_SENT: 'Contact email sent successfully',
  CONTACT_EMAIL_ERROR: 'Error sending contact email',
  CONTACT_EMAIL_RECIPIENTS_MISSING:
    'No recipients provided for contact email notification',
  CONTACT_WHATSAPP_SENT: 'Contact WhatsApp notification sent',
  CONTACT_WHATSAPP_ERROR: 'Error sending contact WhatsApp',
  WHATSAPP_CONFIG_MISSING:
    'WhatsApp configuration missing, skipping WhatsApp notification',
} as const;
