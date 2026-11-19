import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { EmailTemplateDataMap } from "../types";

/**
 * Dados de exemplo de cada template, para o preview e para os testes.
 *
 * O mapa é tipado pela mesma tabela dos templates: um template novo sem
 * amostra não compila, então o preview nunca fica para trás do catálogo.
 */
export const EMAIL_PREVIEW_SAMPLES: {
  readonly [TKey in EmailTemplateKey]: EmailTemplateDataMap[TKey];
} = {
  [EmailTemplateKey.PASSWORD_RESET]: {
    userName: "Maria Souza",
    resetLink: "https://www.orfanatonib.com/recuperar-senha/token-de-exemplo",
    ttlMinutes: 30,
  },
  [EmailTemplateKey.PASSWORD_CHANGED]: {
    userName: "Maria Souza",
  },
  [EmailTemplateKey.EMAIL_VERIFICATION]: {
    userName: "Maria Souza",
    verificationLink:
      "https://www.orfanatonib.com/verificar-email/token-de-exemplo",
    ttlHours: 24,
  },
  [EmailTemplateKey.ACCOUNT_APPROVED]: {
    userName: "Maria Souza",
  },
  [EmailTemplateKey.CONTACT_RECEIVED]: {
    name: "João da Silva",
    email: "joao@exemplo.com",
    phone: "(92) 99999-0000",
    message:
      "Gostaria de saber como ajudar o abrigo.\nPosso doar roupas e brinquedos.",
  },
  [EmailTemplateKey.EVENT_NOTICE]: {
    title: "Festa de Natal",
    date: "20/12/2026 às 15h",
    location: "Abrigo Esperança - Centro, Manaus",
    description: "Confraternização com as crianças e as famílias.",
    actionLabel: "foi criado",
    subjectLine: "Novo evento: Festa de Natal - Orfanatos NIB",
  },
  [EmailTemplateKey.FEEDBACK_RECEIVED]: {
    name: "Ana Lima",
    email: "ana@exemplo.com",
    rating: 5,
    comment: "O site está muito melhor, parabéns pelo trabalho!",
  },
  [EmailTemplateKey.PHOTO_UPLOADED]: {
    caption: "Visita de sábado",
    photoCount: 3,
  },
  [EmailTemplateKey.FEED_COMMENT_PENDING]: {
    authorName: "Maria S.",
    postCaption: "Visita de sábado",
  },
  [EmailTemplateKey.FEED_COMMENT_APPROVED]: {
    userName: "Maria",
    commentExcerpt: "Que alegria ver as crianças tão felizes!",
    postCaption: "Visita de sábado",
  },
  [EmailTemplateKey.FEED_COMMENT_REJECTED]: {
    userName: "Maria",
    commentExcerpt: "Que alegria ver as crianças tão felizes!",
    postCaption: "Visita de sábado",
    reason: "Prefira comentários sobre a atividade da visita.",
  },
  [EmailTemplateKey.COMMENT_RECEIVED]: {
    authorName: "Carlos Pereira",
    clubinho: "12",
    neighborhood: "Cidade Nova",
    comment: "As crianças adoraram a visita de sábado.",
  },
  [EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED]: {
    userName: "Maria Souza",
    shelterName: "Abrigo Esperança",
    teamNumber: 2,
    assigned: true,
  },
  [EmailTemplateKey.PAGELA_REMINDER]: {
    userName: "Maria Souza",
    shelterName: "Abrigo Esperança",
    referenceLabel: "setembro de 2026",
    pendingCount: 7,
  },
  [EmailTemplateKey.VISIT_REPORT_REMINDER]: {
    userName: "Maria Souza",
    shelterName: "Abrigo Esperança",
    referenceLabel: "a semana passada",
  },
};
