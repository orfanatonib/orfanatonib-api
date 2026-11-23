import { InboxNotificationSource } from "../enums/inbox-notification-source.enum";
import { InboxNotificationType } from "../enums/inbox-notification-type.enum";

export const INBOX_SOURCE_LABELS: Readonly<
  Record<InboxNotificationSource, string>
> = {
  [InboxNotificationSource.ORFANATO_STUDIO]: "Estúdio Orfanato",
  [InboxNotificationSource.CLUBINHO_LESSONS]: "Estúdio Clubinho",
};

export const INBOX_TYPE_TITLES: Readonly<
  Record<InboxNotificationType, string>
> = {
  [InboxNotificationType.PRODUCTION_COMPLETED]: "Produção concluída",
  [InboxNotificationType.SUBMITTED_FOR_REVIEW]: "Enviado para revisão",
  [InboxNotificationType.RESUBMITTED_FOR_REVIEW]: "Reenviado para revisão",
  [InboxNotificationType.CHANGES_REQUESTED]: "Ajuste solicitado",
  [InboxNotificationType.STAGE_APPROVED]: "Item aprovado",
  [InboxNotificationType.PUBLISHED]: "Publicado",
  [InboxNotificationType.GENERATION_COMPLETED]: "Geração concluída",
  [InboxNotificationType.GENERATION_FAILED]: "Falha na geração",
};
