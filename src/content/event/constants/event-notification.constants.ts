export enum EventAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  AUDIENCE_CHANGED = 'audience_changed',
  DATE_CHANGED = 'date_changed',
  LOCATION_CHANGED = 'location_changed',
  LOST_ACCESS = 'lost_access',
}

export const EventNotificationMessages = {
  CREATED: {
    subject: 'Novo Evento Criado - Orfanatos NIB',
    title: 'Novo Evento',
    action: 'foi criado',
    description:
      'Um novo evento foi adicionado ao calendario. Confira os detalhes abaixo e marque na sua agenda!',
    callToAction: 'Esperamos voce la!',
  },
  UPDATED: {
    subject: 'Evento Atualizado - Orfanatos NIB',
    title: 'Evento Atualizado',
    action: 'foi atualizado',
    description:
      'As informacoes do evento foram atualizadas. Por favor, verifique os novos detalhes abaixo.',
    callToAction: 'Fique atento as mudancas!',
  },
  DELETED: {
    subject: 'Evento Cancelado - Orfanatos NIB',
    title: 'Evento Cancelado',
    action: 'foi cancelado',
    description:
      'Infelizmente, este evento foi cancelado. Pedimos desculpas pelo inconveniente.',
    callToAction: 'Fique atento aos proximos eventos!',
  },
  AUDIENCE_CHANGED: {
    subject: 'Mudanca de Publico Alvo - Orfanatos NIB',
    title: 'Publico Alvo Alterado',
    action: 'teve seu publico alvo alterado',
    description:
      'O publico alvo deste evento foi alterado. Confira os detalhes abaixo.',
    callToAction: 'Fique atento!',
  },
  DATE_CHANGED: {
    subject: 'Data do Evento Alterada - Orfanatos NIB',
    title: 'Data Alterada',
    action: 'mudou de data',
    description: 'A data deste evento foi alterada. Confira a nova data abaixo.',
    callToAction: 'Atualize sua agenda!',
  },
  LOCATION_CHANGED: {
    subject: 'Local do Evento Alterado - Orfanatos NIB',
    title: 'Local Alterado',
    action: 'mudou de local',
    description: 'O local deste evento foi alterado. Confira o novo endereco abaixo.',
    callToAction: 'Fique atento ao novo local!',
  },
  LOST_ACCESS: {
    subject: 'Mudanca de Publico - Orfanatos NIB',
    title: 'Evento Nao Disponivel',
    action: 'nao esta mais disponivel para voce',
    description:
      'O publico alvo deste evento foi alterado e ele nao esta mais disponivel para o seu perfil.',
    callToAction: 'Fique atento aos proximos eventos!',
  },
} as const;

export const EventNotificationLogs = {
  EMAIL_SENT: (email: string, action: EventAction) =>
    `Event ${action} notification sent to: ${email}`,
  EMAIL_ERROR: (email: string, error: string) =>
    `Error sending event notification to ${email}: ${error}`,
  NO_RECIPIENTS: (audience: string) =>
    `No recipients found for event notification with audience: ${audience}`,
  NOTIFICATION_STARTED: (eventId: string, action: EventAction) =>
    `Starting event ${action} notification for event: ${eventId}`,
  NOTIFICATION_COMPLETED: (eventId: string, recipientCount: number) =>
    `Event notification completed for event ${eventId}, sent to ${recipientCount} recipients`,
} as const;
