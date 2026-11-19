/** `details.code` do 403 devolvido quando a flag do recurso está desligada para o ator. */
export const FEATURE_DISABLED_CODE = "FEATURE_DISABLED";
export const FEATURE_FLAGS_CACHE_TTL_MS = 60_000;
export const FEATURE_FLAG_SWITCH_CACHE_SCOPE = "__switch__";
export const FEATURE_FLAG_MAP_CACHE_SCOPE = "__map__";
export const FEATURE_FLAG_TARGET_ROLES_METADATA_KEY = "targetRoles";

/**
 * Flags aposentadas: são removidas do banco na conferência do catálogo.
 *
 * `event-email-notifications` era o interruptor legado dos avisos de evento e
 * conviveu com `email-event-notice`, que faz o mesmo. Dois interruptores para a
 * mesma coisa, com padrões opostos: quem desligasse só um acharia que não
 * funcionou. Ficou o do catálogo de e-mail, que segue o padrão `email-<tipo>`.
 */
export const RETIRED_FEATURE_FLAGS: readonly string[] = [
  "event-email-notifications",
  // Nunca existiu no Orfanato NIB; removida do catálogo.
  "special_family_day",
];

/**
 * Prefixo das flags operacionais de e-mail. Elas governam envio no servidor e
 * **não** são consumidas pela interface, então ficam fora do mapa público.
 */
export const INTERNAL_FEATURE_FLAG_PREFIXES: readonly string[] = [
  "email_",
  // Versão N do rollout em dois passos: as chaves antigas ainda existem no
  // banco (instâncias antigas as leem) e não podem vazar no mapa público.
  "email-",
];

/** `true` quando a flag é operacional de backend, não de interface. */
export const isInternalFeatureFlag = (key: string): boolean =>
  INTERNAL_FEATURE_FLAG_PREFIXES.some((prefix) => key.startsWith(prefix));

/**
 * Renomeações para o formato do Clubinho (`snake_case`, `email_*`). No boot, se
 * a chave nova ainda não existe e a antiga existe, a nova nasce **copiando
 * `enabled` e `targetRoles` da antiga** — renomear não liga nem desliga nada.
 *
 * Rollout em dois passos: na versão N as chaves antigas continuam no banco
 * (instâncias antigas ainda as leem durante o deploy rolante); na versão N+1
 * elas passam para `RETIRED_FEATURE_FLAGS` e são removidas.
 */
export const FEATURE_FLAG_RENAMES: readonly {
  readonly from: string;
  readonly to: readonly string[];
}[] = [
  { from: "shelter-address", to: ["shelter_address"] },
  { from: "shelter-management", to: ["sheltered_management"] },
  // Uma chave antiga governava a área do membro E o painel: vira duas.
  { from: "shelter-pagelas", to: ["sheltered_area", "pagelas"] },
  { from: "content-studio", to: ["content_studio"] },
  { from: "content-studio-generation", to: ["content_studio_generation"] },
  { from: "content-studio-review", to: ["content_studio_review"] },
  { from: "content-studio-publication", to: ["content_studio_publication"] },
  {
    from: "content-studio-provider-admin",
    to: ["content_studio_provider_admin"],
  },
  { from: "email-delivery", to: ["email_delivery"] },
  { from: "email-password-reset", to: ["email_password_reset"] },
  { from: "email-password-changed", to: ["email_password_changed"] },
  { from: "email-email-verification", to: ["email_verification"] },
  { from: "email-account-approved", to: ["email_account_approved"] },
  { from: "email-contact-received", to: ["email_contact_received"] },
  { from: "email-event-notice", to: ["email_event_notice"] },
  { from: "email-feedback-received", to: ["email_feedback_received"] },
  { from: "email-comment-received", to: ["email_comment_received"] },
  {
    from: "email-team-assignment-changed",
    to: ["email_team_assignment_changed"],
  },
  { from: "email-pagela-reminder", to: ["email_pagela_reminder"] },
  {
    from: "email-visit-report-reminder",
    to: ["email_visit_report_reminder"],
  },
];

export const DEFAULT_FEATURE_FLAGS = [
  {
    key: "public_registration",
    name: "Cadastro pelo site",
    description: "Interruptor do recurso: cadastro pelo site.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "google_login",
    name: "Login e cadastro com Google",
    description: "Interruptor do recurso: login e cadastro com Google.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "password_recovery",
    name: "Recuperação de senha",
    description: "Interruptor do recurso: recuperação de senha.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "contact_form",
    name: "Formulário de contato",
    description: "Interruptor do recurso: formulário de contato.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "events_section",
    name: "Página de eventos",
    description: "Interruptor do recurso: página de eventos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed",
    name: "Feed dos abrigos",
    description: "Interruptor do recurso: feed dos abrigos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed_celebrations",
    name: "Celebrar publicações do feed",
    description:
      "Interruptor do recurso: celebrar publicações do feed dos abrigos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed_comments",
    name: "Comentários nas fotos do feed",
    description:
      "Interruptor do recurso: comentários nas fotos do feed dos abrigos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "home_comments",
    name: "Depoimentos na página inicial",
    description: "Interruptor do recurso: depoimentos na página inicial.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "public_galleries",
    name: "Galerias públicas de fotos",
    description: "Interruptor do recurso: galerias públicas de fotos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "public_videos",
    name: "Páginas públicas de vídeos",
    description: "Interruptor do recurso: páginas públicas de vídeos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_pages",
    name: "Páginas públicas de abrigo",
    description: "Interruptor do recurso: páginas públicas de abrigo.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "about_page",
    name: "Página Sobre",
    description: "Interruptor do recurso: página Sobre.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_address",
    name: "Endereço dos abrigos",
    description: "Interruptor do recurso: endereço dos abrigos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "member_area",
    name: "Área do Membro (hub e casca)",
    description: "Interruptor do recurso: área do Membro (hub e casca).",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "visit_materials",
    name: "Materiais de visita",
    description: "Interruptor do recurso: materiais de visita.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "documents_library",
    name: "Biblioteca de documentos",
    description: "Interruptor do recurso: biblioteca de documentos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "training_videos",
    name: "Vídeos de treinamento",
    description: "Interruptor do recurso: vídeos de treinamento.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "ideas_sharing",
    name: "Galeria de ideias",
    description: "Interruptor do recurso: galeria de ideias.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "idea_submission",
    name: "Envio de ideias",
    description: "Interruptor do recurso: envio de ideias.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "shelter_photo_upload",
    name: "Envio de fotos do abrigo",
    description: "Interruptor do recurso: envio de fotos do abrigo.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "site_feedback",
    name: "Avaliação do site",
    description: "Interruptor do recurso: avaliação do site.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "member_manual",
    name: "Manual do Membro",
    description: "Interruptor do recurso: manual do Membro.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "weekly_meditation",
    name: "Meditação da semana",
    description: "Interruptor do recurso: meditação da semana.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "informative_banners",
    name: "Informativos",
    description: "Interruptor do recurso: informativos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "comment_submission",
    name: "Envio de depoimentos",
    description: "Interruptor do recurso: envio de depoimentos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "sheltered_area",
    name: "Área dos Acolhidos",
    description: "Interruptor do recurso: área dos Acolhidos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "accepted_christs",
    name: "Registro de decisão por Cristo",
    description: "Interruptor do recurso: registro de decisão por Cristo.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "attendance",
    name: "Frequência",
    description: "Interruptor do recurso: frequência.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "integration",
    name: "Integração",
    description: "Interruptor do recurso: integração.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "comment_moderation",
    name: "Moderação de depoimentos",
    description: "Interruptor do recurso: moderação de depoimentos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "document_management",
    name: "Gestão de documentos",
    description: "Interruptor do recurso: gestão de documentos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "informative_management",
    name: "Gestão de informativos",
    description: "Interruptor do recurso: gestão de informativos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "feedback_management",
    name: "Gestão de avaliações do site",
    description: "Interruptor do recurso: gestão de avaliações do site.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "contact_management",
    name: "Gestão de contatos",
    description: "Interruptor do recurso: gestão de contatos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "page_management",
    name: "Criação e gestão de páginas",
    description: "Interruptor do recurso: criação e gestão de páginas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "meditation_management",
    name: "Gestão de meditações",
    description: "Interruptor do recurso: gestão de meditações.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "event_management",
    name: "Gestão de eventos",
    description: "Interruptor do recurso: gestão de eventos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "photo_moderation",
    name: "Moderação de fotos",
    description: "Interruptor do recurso: moderação de fotos.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "idea_moderation",
    name: "Moderação de ideias",
    description: "Interruptor do recurso: moderação de ideias.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "user_management",
    name: "Gestão de usuários e perfis",
    description: "Interruptor do recurso: gestão de usuários e perfis.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "leader_management",
    name: "Gestão de líderes",
    description: "Interruptor do recurso: gestão de líderes.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "member_management",
    name: "Gestão de membros",
    description: "Interruptor do recurso: gestão de membros.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "shelter_management",
    name: "Gestão de abrigos e equipes",
    description: "Interruptor do recurso: gestão de abrigos e equipes.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "sheltered_management",
    name: "Gestão de acolhidos",
    description: "Interruptor do recurso: gestão de acolhidos.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "pagelas",
    name: "Pagelas",
    description: "Interruptor do recurso: pagelas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "shelter_schedule",
    name: "Agendamentos dos abrigos",
    description: "Interruptor do recurso: agendamentos dos abrigos.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "criminal_records",
    name: "Antecedentes criminais",
    description: "Interruptor do recurso: antecedentes criminais.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "visit_reports",
    name: "Relatórios de visita",
    description: "Interruptor do recurso: relatórios de visita.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "content_studio",
    name: "Estúdio: entrada",
    description: "Interruptor do recurso: estúdio: entrada.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_generation",
    name: "Estúdio: geração",
    description: "Interruptor do recurso: estúdio: geração.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_review",
    name: "Estúdio: revisão",
    description: "Interruptor do recurso: estúdio: revisão.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_publication",
    name: "Estúdio: publicação",
    description: "Interruptor do recurso: estúdio: publicação.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_provider_admin",
    name: "Estúdio: provedores de IA",
    description: "Interruptor do recurso: estúdio: provedores de IA.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "observability_audit",
    name: "Auditoria e observabilidade",
    description: "Interruptor do recurso: auditoria e observabilidade.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "email_delivery",
    name: "E-mail: Chave Mestra de Envios",
    description: "Interrompe todos os envios de e-mail em uma emergência.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_password_reset",
    name: "E-mail: Recuperação de Senha",
    description: "Envia o link de redefinição de senha.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_password_changed",
    name: "E-mail: Senha Alterada",
    description: "Avisa que a senha de uma conta foi alterada.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_verification",
    name: "E-mail: Confirmação de Endereço",
    description: "Envia o link de confirmação do endereço de e-mail.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_account_approved",
    name: "E-mail: Cadastro Aprovado",
    description: "Avisa que um cadastro foi aprovado.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_contact_received",
    name: "E-mail: Novo Contato",
    description: "Avisa a equipe sobre uma mensagem de contato recebida.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_image_shared_notification",
    name: "E-mail: Nova Publicação do Feed",
    description:
      "Avisa os admins sobre publicação (fotos/vídeo) aguardando aprovação no feed de abrigos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_image_rejected_notification",
    name: "E-mail: Publicação do Feed Reprovada",
    description:
      "Avisa o autor que a publicação de fotos/vídeo foi reprovada, com o motivo.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_feed_comment_pending",
    name: "E-mail: Comentário do Feed Aguardando Aprovação",
    description:
      "Avisa a coordenação sobre comentário novo no feed aguardando moderação.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_feed_comment_approved",
    name: "E-mail: Comentário do Feed Aprovado",
    description: "Avisa o autor que o comentário foi aprovado e publicado.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_feed_comment_rejected",
    name: "E-mail: Comentário do Feed Reprovado",
    description: "Avisa o autor que o comentário foi reprovado, com o motivo.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_event_notice",
    name: "E-mail: Aviso de Evento",
    description: "Envia avisos relacionados a eventos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_feedback_received",
    name: "E-mail: Nova Avaliação",
    description: "Avisa a equipe quando o site recebe uma avaliação.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_comment_received",
    name: "E-mail: Novo Comentário",
    description: "Avisa a equipe quando o site recebe um comentário.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_team_assignment_changed",
    name: "E-mail: Alteração de Equipe",
    description: "Avisa sobre mudanças de vínculo com uma equipe.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_pagela_reminder",
    name: "E-mail: Lembrete de Pagela",
    description: "Envia lembretes de pagelas pendentes.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email_visit_report_reminder",
    name: "E-mail: Lembrete de Relatório de Visita",
    description: "Envia lembretes de relatórios de visita pendentes.",
    enabled: true,
    targetRoles: [],
  },
] as const;

export const FEATURE_FLAGS_DEFAULT_PAGE = 1;
export const FEATURE_FLAGS_DEFAULT_LIMIT = 12;
export const FEATURE_FLAGS_MAX_LIMIT = 100;
export const FEATURE_FLAG_SEARCH_MAX_LENGTH = 200;

export const FEATURE_FLAG_SORT_FIELDS = [
  "name",
  "key",
  "createdAt",
  "updatedAt",
] as const;
export const FEATURE_FLAG_DEFAULT_SORT = "name";
export const FEATURE_FLAG_DEFAULT_ORDER = "ASC";
export const FEATURE_FLAG_SORT_COLUMNS = {
  name: "flag.name",
  key: "flag.key",
  createdAt: "flag.createdAt",
  updatedAt: "flag.updatedAt",
} as const satisfies Record<(typeof FEATURE_FLAG_SORT_FIELDS)[number], string>;

export const FEATURE_FLAG_AUDIENCES = [
  "EVERYONE",
  "ADMIN",
  "LEADER",
  "MEMBER",
  "ADMIN_LEADER",
  "ADMIN_MEMBER",
  "LEADER_MEMBER",
  "ALL_ROLES",
] as const;
