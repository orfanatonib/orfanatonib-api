/** `details.code` do 403 devolvido quando a flag do recurso está desligada para o ator. */
export const FEATURE_DISABLED_CODE = "FEATURE_DISABLED";
export const FEATURE_FLAGS_CACHE_TTL_MS = 60_000;
/**
 * TTL das flags operacionais (`email_*`): são chaves-mestras de envio e o
 * administrador espera que "desligar" valha logo, em qualquer instância.
 */
export const FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS = 5_000;
/** Canal Redis (pub/sub) de invalidação do cache entre instâncias. */
export const FEATURE_FLAGS_INVALIDATION_CHANNEL =
  "orfanato:feature-flags:invalidate";
/** `details.code` do 409 de escrita sobre flag protegida. */
export const FEATURE_FLAG_PROTECTED_CODE = "FEATURE_FLAG_PROTECTED";
/** `details.code` do 409 de versão desatualizada (controle otimista). */
export const FEATURE_FLAG_VERSION_CONFLICT_CODE =
  "FEATURE_FLAG_VERSION_CONFLICT";
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
    description:
      "Permite que qualquer visitante crie uma conta pelo site (tela de cadastro e rota de registro da API). Desligada, o botão de cadastro some e novas contas só podem ser criadas por um administrador.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "google_login",
    name: "Login e cadastro com Google",
    description:
      "Permite entrar e se cadastrar usando a conta Google (botão 'Entrar com Google' no login e no cadastro). Desligada, só o login por e-mail e senha continua disponível.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "password_recovery",
    name: "Recuperação de senha",
    description:
      "Habilita o fluxo 'Esqueci minha senha': link na tela de login, pedido de redefinição e troca da senha pelo link recebido. Desligada, quem esquecer a senha precisa pedir a um administrador.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "contact_form",
    name: "Formulário de contato",
    description:
      "Mostra o formulário 'Fale conosco' do site público e aceita o envio de mensagens de contato. Desligada, o formulário e os botões de contato da página inicial somem e a API recusa novos envios.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "events_section",
    name: "Página de eventos",
    description:
      "Exibe a seção/página pública de eventos (lista de próximos eventos). Desligada, a seção some do site e a listagem pública de eventos fica indisponível.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed",
    name: "Feed dos abrigos",
    description:
      "Liga o feed dos abrigos: publicações de fotos e vídeos das visitas, visíveis para quem tem acesso ao abrigo. Desligada, o feed inteiro (listagem, envio e moderação) fica indisponível.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed_celebrations",
    name: "Celebrar publicações do feed",
    description:
      "Permite 'celebrar' (reagir) às publicações do feed dos abrigos. Desligada, o botão de celebrar some e a API recusa novas celebrações; as publicações continuam visíveis.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_feed_comments",
    name: "Comentários nas fotos do feed",
    description:
      "Permite comentar nas fotos/publicações do feed dos abrigos e habilita a moderação desses comentários no painel. Desligada, não é possível comentar nem moderar comentários do feed.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "home_comments",
    name: "Depoimentos na página inicial",
    description:
      "Exibe os depoimentos aprovados na página inicial do site. Desligada, a seção de depoimentos some e a página inicial deixa de buscar os comentários.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "public_galleries",
    name: "Galerias públicas de fotos",
    description:
      "Habilita as galerias públicas de fotos do site (páginas de imagens criadas no painel). Desligada, essas páginas deixam de abrir para o público.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "public_videos",
    name: "Páginas públicas de vídeos",
    description:
      "Habilita as páginas públicas de vídeos do site (páginas de vídeos criadas no painel). Desligada, essas páginas deixam de abrir para o público.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_pages",
    name: "Páginas públicas de abrigo",
    description:
      "Habilita as páginas públicas de apresentação de cada abrigo no site. Desligada, os links para essas páginas somem e elas deixam de abrir.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "about_page",
    name: "Página Sobre",
    description:
      "Exibe a página 'Sobre' do site e seu link no menu. Desligada, a página e o link ficam indisponíveis.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "shelter_address",
    name: "Endereço dos abrigos",
    description:
      "Mostra o endereço dos abrigos (cartões, detalhes e formulário de abrigo). Desligada, o endereço fica oculto e deixa de ser editável/consultável.",
    enabled: true,
    targetRoles: [],
  },
  {
    key: "member_area",
    name: "Área do Membro (hub e casca)",
    description:
      "Liga a Área do Membro inteira: casca, menu e página inicial do membro, e o botão de acesso a ela no site. Desligada, ninguém entra na Área do Membro e os atalhos para ela somem.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "visit_materials",
    name: "Materiais de visita",
    description:
      "Liga os materiais de visita: páginas com roteiros e materiais para as visitas aos abrigos, na Área do Membro e no banner da página inicial. Desligada, esses materiais ficam indisponíveis.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "documents_library",
    name: "Biblioteca de documentos",
    description:
      "Liga a biblioteca de documentos da Área do Membro (consulta e download de documentos). Desligada, o item de menu some e a consulta é bloqueada.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "training_videos",
    name: "Vídeos de treinamento",
    description:
      "Liga os vídeos de treinamento da Área do Membro (consulta das aulas em vídeo). Desligada, o item de menu some e a consulta é bloqueada.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "ideas_sharing",
    name: "Galeria de ideias",
    description:
      "Liga a galeria de ideias compartilhadas na Área do Membro (consulta das ideias publicadas). Desligada, o item de menu some e a galeria deixa de abrir.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "idea_submission",
    name: "Envio de ideias",
    description:
      "Permite que membros enviem novas ideias (botão e banner 'Compartilhe sua ideia'). Desligada, o envio some; as ideias já publicadas continuam visíveis se a galeria estiver ligada.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "shelter_photo_upload",
    name: "Envio de fotos do abrigo",
    description:
      "Permite que membros e líderes enviem fotos do abrigo pela Área do Membro. Desligada, o botão de envio some e a API recusa novos uploads.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "site_feedback",
    name: "Avaliação do site",
    description:
      "Permite que usuários avaliem o site (formulário de avaliação/feedback). Desligada, o formulário some e a API recusa novas avaliações.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "member_manual",
    name: "Manual do Membro",
    description:
      "Exibe o manual do Membro na Área do Membro (guia de uso e orientações). Desligada, o item de menu e o conteúdo do manual ficam indisponíveis.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "weekly_meditation",
    name: "Meditação da semana",
    description:
      "Exibe a meditação da semana para os membros (página inicial e Área do Membro). Desligada, a meditação da semana deixa de ser mostrada e consultada.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "informative_banners",
    name: "Informativos",
    description:
      "Exibe os informativos (banners de avisos) para os membros e permite sua consulta. Desligada, os banners deixam de aparecer e de ser listados.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "comment_submission",
    name: "Envio de depoimentos",
    description:
      "Permite que visitantes e membros enviem depoimentos/comentários para moderação. Desligada, a API recusa novos envios; os já aprovados continuam conforme 'home_comments'.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "sheltered_area",
    name: "Área dos Acolhidos",
    description:
      "Liga a área dos Acolhidos para líderes e membros: listagem e consulta dos acolhidos dos seus abrigos. Desligada, o item de menu e as consultas ficam bloqueados.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "accepted_christs",
    name: "Registro de decisão por Cristo",
    description:
      "Liga o registro de decisões por Cristo dos acolhidos (marcar e consultar quem aceitou Jesus). Desligada, o registro e a consulta ficam indisponíveis.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "attendance",
    name: "Frequência",
    description:
      "Liga o controle de frequência: lançar, consultar e acompanhar presenças das equipes, e o aviso de pendências. Desligada, todo o módulo de presença some do painel e da API.",
    enabled: true,
    targetRoles: ["admin", "leader", "member"],
  },
  {
    key: "integration",
    name: "Integração Feira de Ministério",
    description:
      "Integração Feira de Ministério: botão 'Integração' na Área do Membro e no cartão dos acolhidos, e a página de registro da integração (admin e líder). Desligada, o botão e a página somem e a API recusa os registros.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "comment_moderation",
    name: "Moderação de depoimentos",
    description:
      "Libera no painel a moderação de depoimentos (aprovar, reprovar, apagar) e o contador de pendentes. Desligada, a tela e as ações de moderação ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "document_management",
    name: "Gestão de documentos",
    description:
      "Libera no painel a gestão de documentos (enviar, editar, excluir arquivos da biblioteca). Desligada, a tela e as ações de gestão ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "informative_management",
    name: "Gestão de informativos",
    description:
      "Libera no painel a gestão de informativos (criar, editar, ordenar e remover banners de avisos). Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "feedback_management",
    name: "Gestão de avaliações do site",
    description:
      "Libera no painel a leitura e o tratamento das avaliações do site, com o contador de não lidas. Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "contact_management",
    name: "Gestão de contatos",
    description:
      "Libera no painel a gestão das mensagens recebidas pelo formulário de contato (ler, marcar como atendida, excluir) e o contador de pendentes. Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "page_management",
    name: "Criação e gestão de páginas",
    description:
      "Libera no painel a criação e edição das páginas do site (fotos, vídeos, materiais de visita e ideias) e o assistente 'Nova página'. Desligada, essas telas e ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "meditation_management",
    name: "Gestão de meditações",
    description:
      "Libera no painel a gestão das meditações (criar, editar e publicar a meditação da semana). Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "event_management",
    name: "Gestão de eventos",
    description:
      "Libera a gestão de eventos (criar, editar e remover eventos do site e seus avisos). Desligada, as rotas administrativas de eventos ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "photo_moderation",
    name: "Moderação de fotos",
    description:
      "Libera no painel a moderação das fotos enviadas pelos abrigos (aprovar, editar, excluir seções de imagens). Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "idea_moderation",
    name: "Moderação de ideias",
    description:
      "Libera no painel a moderação das ideias compartilhadas (revisar, editar, excluir) e o contador de pendentes. Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "user_management",
    name: "Gestão de usuários e perfis",
    description:
      "Libera no painel a gestão de usuários e perfis (listar, editar, ativar/desativar, trocar papel). Desligada, as telas de Usuários e Perfis ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin"],
  },
  {
    key: "leader_management",
    name: "Gestão de líderes",
    description:
      "Libera a gestão de líderes (cadastro, edição, vínculo com abrigos e equipes) para admin e líder. Desligada, a tela de Líderes e suas ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "member_management",
    name: "Gestão de membros",
    description:
      "Libera a gestão de membros (cadastro, edição, vínculo com equipes) para admin e líder. Desligada, a tela de Membros e suas ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "shelter_management",
    name: "Gestão de abrigos e equipes",
    description:
      "Libera a gestão de abrigos e equipes (criar, editar, vincular líderes e membros) e o atalho 'Gerenciar Equipe'. Desligada, as telas e as consultas de abrigos e equipes ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "sheltered_management",
    name: "Gestão de acolhidos",
    description:
      "Libera a gestão de acolhidos no painel (cadastrar, editar, vincular a abrigo e responsáveis). Desligada, a tela de Acolhidos e suas ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "pagelas",
    name: "Pagelas",
    description:
      "Libera as pagelas no painel: registro semanal de cada acolhido por abrigo. Desligada, a tela de Pagelas e a API correspondente ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "shelter_schedule",
    name: "Agendamentos dos abrigos",
    description:
      "Libera os agendamentos dos abrigos (calendário de visitas e responsáveis por dia). Desligada, a tela de Agendamentos e suas ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "criminal_records",
    name: "Antecedentes criminais",
    description:
      "Libera o controle de antecedentes criminais dos voluntários (envio e conferência dos documentos). Desligada, a tela e as ações ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "visit_reports",
    name: "Relatórios de visita",
    description:
      "Libera os relatórios de visita (preenchimento, consulta e lista de pendências por abrigo). Desligada, as telas e a API de relatórios ficam bloqueadas.",
    enabled: true,
    targetRoles: ["admin", "leader"],
  },
  {
    key: "content_studio",
    name: "Estúdio: entrada",
    description:
      "Porta de entrada do Estúdio Orfanato (geração de conteúdo com IA): libera o menu, a Home do Estúdio, a produção e as orientações. Desligada, todo o Estúdio fica inacessível, mesmo com as demais flags do Estúdio ligadas.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_generation",
    name: "Estúdio: geração",
    description:
      "Permite gerar conteúdo (lições, textos e visuais) com IA no Estúdio. Desligada, os botões de gerar somem e a API recusa novas gerações.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_review",
    name: "Estúdio: revisão",
    description:
      "Libera a revisão do Estúdio: fila de revisão, aprovar, devolver para ajuste e histórico por item. Desligada, as telas e ações de revisão ficam bloqueadas.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_publication",
    name: "Estúdio: publicação",
    description:
      "Permite publicar no site o conteúdo aprovado do Estúdio (publicação incremental por categoria). Desligada, o botão de publicar some e a API recusa a publicação.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "content_studio_provider_admin",
    name: "Estúdio: provedores de IA",
    description:
      "Libera a configuração dos provedores de IA do Estúdio (chaves, modelos e provedor ativo). Exige também 'content_studio'. Desligada, a tela de provedores fica bloqueada.",
    enabled: false,
    targetRoles: ["admin"],
  },
  {
    key: "observability_audit",
    name: "Auditoria e observabilidade",
    description:
      "Libera a tela de observabilidade e auditoria (trilha de ações e eventos do sistema) para administradores. Desligada, a tela e sua API ficam bloqueadas.",
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

/** Prefixo da descrição genérica antiga, substituída pela do catálogo no boot. */
export const PLACEHOLDER_FLAG_DESCRIPTION_PREFIX = "Interruptor do recurso:";

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
