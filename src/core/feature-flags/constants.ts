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
];

/**
 * Prefixo das flags operacionais de e-mail. Elas governam envio no servidor e
 * **não** são consumidas pela interface, então ficam fora do mapa público.
 */
export const INTERNAL_FEATURE_FLAG_PREFIXES: readonly string[] = ["email-"];

/** `true` quando a flag é operacional de backend, não de interface. */
export const isInternalFeatureFlag = (key: string): boolean =>
  INTERNAL_FEATURE_FLAG_PREFIXES.some((prefix) => key.startsWith(prefix));

export const DEFAULT_FEATURE_FLAGS = [
  {
    key: "shelter-address",
    name: "Endereço dos Abrigos",
    description:
      "Exibição do endereço dos abrigos nas telas públicas e internas.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter-management",
    name: "Gestão de Acolhidos",
    description: "Cadastro, consulta e manutenção dos acolhidos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "shelter-pagelas",
    name: "Pagelas dos Abrigos",
    description: "Consulta e gestão das pagelas dos acolhidos.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "email-delivery",
    name: "E-mail: Chave Mestra de Envios",
    description: "Interrompe todos os envios de e-mail em uma emergência.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-password-reset",
    name: "E-mail: Recuperação de Senha",
    description: "Envia o link de redefinição de senha.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-password-changed",
    name: "E-mail: Senha Alterada",
    description: "Avisa que a senha de uma conta foi alterada.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-email-verification",
    name: "E-mail: Confirmação de Endereço",
    description: "Envia o link de confirmação do endereço de e-mail.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-account-approved",
    name: "E-mail: Cadastro Aprovado",
    description: "Avisa que um cadastro foi aprovado.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-contact-received",
    name: "E-mail: Novo Contato",
    description: "Avisa a equipe sobre uma mensagem de contato recebida.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-event-notice",
    name: "E-mail: Aviso de Evento",
    description: "Envia avisos relacionados a eventos.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-feedback-received",
    name: "E-mail: Nova Avaliação",
    description: "Avisa a equipe quando o site recebe uma avaliação.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-comment-received",
    name: "E-mail: Novo Comentário",
    description: "Avisa a equipe quando o site recebe um comentário.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-team-assignment-changed",
    name: "E-mail: Alteração de Equipe",
    description: "Avisa sobre mudanças de vínculo com uma equipe.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-pagela-reminder",
    name: "E-mail: Lembrete de Pagela",
    description: "Envia lembretes de pagelas pendentes.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "email-visit-report-reminder",
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
