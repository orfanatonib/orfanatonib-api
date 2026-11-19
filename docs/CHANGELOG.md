# 📝 Changelog - API Orfanatonib

Registro completo de todas as mudanças, atualizações e melhorias do projeto.

---

## [Unreleased] - 2026-10-02 - ESTÚDIO ORFANATO

- **ADD**: `DataSource` compartilhado pela aplicação e pela CLI do TypeORM.
- **ADD**: comandos locais para gerar, aplicar, reverter e consultar migrations.
- **ADD**: baseline inicial gerado pelo TypeORM; aplicada por adoção verificada
  no banco local existente e validada separadamente em banco descartável.
- **DOCS**: procedimento de adoção do baseline, drift, rollback e ordem de deploy.
- **ADD**: catálogo inicial de feature flags do Estúdio Orfanato, desligadas e
  restritas a administradores por padrão.
- **ADD**: fila paginada de revisão com busca e filtros server-side por status,
  público e período, submissão,
  aprovação por etapa e comentários obrigatórios para solicitar ajustes.
- **ADD**: dashboard administrativo com contagens agregadas, filtros por
  período/público, alertas de jobs e cinco pacotes recentes; métricas comparativas
  e reconciliação automatizada continuam pendentes.
- **FIX**: requisições do dashboard deixam de falhar no banco local após adoção
  segura da baseline existente e aplicação das migrations do Estúdio.
- **ADD**: arquivamento protegido de pacote, bloqueado durante publicação e
  geração ativa.
- **FIX**: criação e edição manual de pacotes não dependem da flag de geração
  de IA; salvar conteúdo cancela jobs ativos da etapa e dos descendentes
  invalidados.
- **FIX**: decisões de revisão exigem a versão, checksum e lock atuais; uma
  edição concorrente não aprova nem comenta uma versão que já ficou desatualizada.
- **ADD**: comentários de revisão vinculados à versão passam a aparecer no
  detalhe da etapa para orientar a nova edição.
- **ADD**: histórico imutável de aprovação/solicitação de ajustes, com versão,
  checksum, revisor e timestamp; gravação transacional e migration gerada via
  TypeORM.
- **SECURITY**: pacotes e payloads estruturados rejeitam padrões comuns de
  dados pessoais e têm limites de tamanho/profundidade; as regras não substituem
  revisão humana.

## [2.10.0] - 2026-09-11 - MÓDULO IDEAS SECTIONS NO PADRÃO 💡

### 🔴 Compartilhar uma ideia não funcionava

- **FIX**: **toda ideia com mídia falhava**. `media_items.title` e
  `.description` são `NOT NULL` sem default, mas o payload os declara
  opcionais: o insert morria com `Field 'description' doesn't have a default
  value`, devolvido ao usuário como um 400 sem sentido. Como a tela de envio
  exige ao menos uma mídia, **nenhuma ideia podia ser compartilhada**
- **FIX**: a seção já estava gravada quando a mídia falhava, e sobrava uma
  ideia sem conteúdo que ninguém removia. Os uploads passam a ser conferidos
  **antes** de qualquer escrita, e uma falha posterior desfaz a seção

### 🐞 Outros defeitos

- **FIX**: **cada `PATCH` criava uma seção nova**. `upsertSection` montava um
  objeto **sem `id`** e chamava `save`, que o TypeORM trata como inserção: a
  original ficava órfã no banco e o cliente recebia outro id. Conferido contra
  o MySQL real antes e depois
- **FIX**: `GET /ideas-sections` e `GET /ideas-sections/:id` **não tinham
  guard** e devolviam nome, e-mail e telefone de quem enviou a ideia a
  qualquer visitante anônimo. Toda a rota passou a exigir autenticação; a
  escrita continua restrita a admin, e o envio a qualquer autenticado
- **FIX**: a trava que impede remover uma seção já publicada **nunca
  disparava** — a seção era lida sem a relação `page`, então o campo vinha
  sempre indefinido
- **FIX**: `JSON.parse` do campo multipart estourava `SyntaxError` e o filtro
  global respondia **500 com a stack trace no corpo**; agora é 400 com os
  campos que não passaram
- **FIX**: a resposta da criação trazia `user: { name: "" }` — a seção
  recém-salva carrega o autor só como `{ id }`
- **FIX**: id fora do formato UUID respondia 404 em vez de 400 (sem
  `ParseUUIDPipe` em rota alguma)

### 🏗️ Estrutura

- **CHANGE**: `IdeasSectionRepository` **estendia** `Repository<Entity>`,
  entregando `find`, `save`, `merge` e `createQueryBuilder` a qualquer serviço
  que a injetasse — e foi assim que a regra de atualização acabou espalhada
  por três serviços. Agora encapsula o TypeORM
- **CHANGE**: `ideas-section-update.service.ts` (**390 linhas**) virou
  `UpdateIdeasSectionService` e `AttachIdeasSectionService`; `addMedia` e
  `upsertMedia`, quase idênticos, viraram `IdeasSectionMediaService`
- **ADD**: `constants.ts`, `types.ts`, `mappers/`, `utils/`
- **CHANGE**: **24 exceções cruas do Nest → 0**; o módulo passou a usar
  `RuleException`, `ResourceNotFoundException` e `ResourceConflictException`
- **CHANGE**: **7 `any` → 0** no backend
- **FIX**: a pasta da entidade se chamava `entites/` (com o typo); renomeada
  para `entities/`, com os 7 imports do projeto corrigidos
- **REMOVE**: `findAllOrfaSections`, cópia literal de `findAllOrphanSections`;
  e `validateFiles` do serviço de criação, que nunca foi chamado
- **CHANGE**: o `normalized` calculado em duas rotas de atualização e **nunca
  usado** saiu junto

### 🖥️ Frontend

- **CHANGE**: os três editores de ideia montavam o multipart cada um do seu
  jeito — um nomeava o campo do arquivo por índice e extensão, outro por
  contador; um fixava `public: true`; só um preservava o `id` das mídias, de
  modo que editar pelos outros apagava e recriava tudo no bucket. Virou
  `buildIdeasSectionFormData`
- **CHANGE**: `api.post`/`patch` cru em três componentes passou para
  `features/ideas-sections/api.ts`; `updateIdeasSection` virou
  `attachIdeasSectionToPage`, porque a chamada **vincula** a seção
- **ADD**: `ideasSectionErrorMessage` — os quatro `catch {}` descartavam a
  explicação da API ("Arquivo ausente para a mídia X" virava "algo deu errado")
- **ADD**: `constants.ts` no padrão do `CLAUDE.md`; rótulos e ícones de mídia
  saíram dos `switch` em `utils.ts`
- **CHANGE**: `MediaItem.mediaType` do módulo não declara mais `audio`, que a
  API recusa e a tela nunca ofereceu
- **REMOVE**: `UpdateSectionPayload`, tipo sem nenhum uso

### 🧪 Testes e documentação

- **ADD**: 87 testes no backend (6 suítes) — o módulo não tinha **nenhum**.
  Cobertura: **98.7% stmts / 98.6% linhas**
- **ADD**: `ideas-sections.api.spec.ts` (16 cenários) e
  `ideas-sections.ui.spec.ts` (6 cenários, inclusive um membro enviando a
  ideia pela tela — o caminho que estava quebrado)
- **ADD**: `data-testid` nas telas de ideias; não havia nenhum
- **ADD**: `docs/modules/ideas-sections/README.md` e
  `docs/diagrams/flow/ideas-sections/ideas-sections-flow.puml` (+ `.png`)
- **VERIFICAÇÃO**: baseline ao vivo capturado antes e depois; as divergências
  são todas deliberadas e estão listadas acima

---

## [2.9.0] - 2026-09-11 - MÓDULO ATTENDANCE NO PADRÃO 📋

### 🐞 Defeitos corrigidos

- **FIX**: **as datas apareciam um dia antes**. `new Date("2026-09-01")` lê a
  data como meia-noite **UTC**, e `toLocaleDateString` a exibe no fuso local —
  em Manaus (UTC-4) o resultado era `31/08/2026`. Afetava o resumo do relatório
  pendente (backend) e toda data de encontro na tela (`formatDateBR`).
  Encontrado ao escrever o primeiro teste do módulo
- **FIX**: `formatDateBR` devolvia a string `"Invalid Date"` na tela para data
  ilegível — `toLocaleDateString` não lança, então o `try/catch` nunca entrava
- **FIX**: o controller lia `req.user?.id`, campo que a `JwtStrategy` **nunca**
  devolve (ela popula `userId`). Os doze endpoints caíam no fallback e
  decodificavam o token uma segunda vez, a cada requisição
- **FIX**: `sortBy` entrava na consulta por um ternário que aceitava qualquer
  texto; agora é restrito ao que o SQL conhece
- **FIX** (frontend): `getTeamAttendanceOverview` chamava
  `/attendance/team/:id/overview`, **endpoint que não existe** no backend

### 🔴 Defeitos que só a tela real revelou

Encontrados ao escrever `attendance.ui.spec.ts`, dirigindo a UI de verdade:

- **FIX**: **o lançamento de frequência estava quebrado**. A tela pedia os
  encontros da equipe com `sortBy=createdAt&sortOrder=desc`, mas o endpoint só
  aceita período — a API respondia **400** e um `catch {}` mudo virava lista
  vazia. O botão ficava permanentemente desabilitado com "Nenhum evento
  disponível para esta equipe". O tipo `ScheduleQuery` afirmava um contrato que
  o backend nunca teve; virou `SortQuery`, usado só onde a ordenação existe
- **FIX**: o erro ao carregar os encontros era engolido pelo `catch` vazio; a
  tela mentia dizendo que a equipe não tinha eventos
- **FIX**: **a mensagem de sucesso nunca era lida**. Depois de salvar, a tela
  recarregava a hierarquia ligando o `loading` — o que trocava a tela inteira
  pelo spinner, desmontava a equipe e levava junto o "Frequência registrada com
  sucesso". A recarga passou a ser silenciosa
- **FIX**: o mesmo desvio de fuso das datas ainda estava em **11 pontos** do
  frontend (`AdminPendingView`, `LeaderPendingView`, `ReportGridView`,
  `ReportTableView`, `VisitReportDetailsModal`, `VisitReportFormModal`,
  `PendingAttendancePage`, `AttendanceBell`, `TeamSchedules`, `PendingLeader`,
  `PendingMember`). A regra virou `formatDayBR` em `src/utils/dates.ts`

### ⚡ Consultas

- **CHANGE**: `findAllPendings` era um método de **278 linhas** com consultas
  dentro de três laços aninhados — uma de agendamentos por equipe, mais duas de
  frequência por agendamento, mais uma de relatório por visita. Com admin, que
  enxerga todas as equipes, isso crescia sem limite. São **quatro consultas
  fixas**, com teste cobrindo exatamente isso
- **CHANGE**: a folha hierárquica seguia o mesmo padrão; agora são três
  consultas
- **CHANGE**: `AttendanceScopeService` resolve as equipes do ator **uma vez**;
  antes cada método refazia a pergunta e cada `assert` disparava outras duas

### 🏗️ Estrutura

- **CHANGE**: `attendance-reader.service.ts` (**968 linhas**, o maior arquivo do
  projeto) dividido em `GetPendingsService`, `GetTeamsService`,
  `GetSchedulesService`, `GetRecordsService` e `GetStatsService`; o writer virou
  `RegisterAttendanceService`
- **ADD**: `AttendanceRepository` — os serviços não tocam mais em TypeORM
- **ADD**: `constants.ts`, `types.ts`, `mappers/`, `utils/`
- **CHANGE**: `dto/attendance-response.dto.ts` (494 linhas) decorava **saídas**
  com `@IsUUID`, `@IsEnum` e `@IsDateString` — validador em DTO de resposta não
  roda. Ficaram só os tipos; o que entra foi para `attendance-filters.dto.ts`
- **ADD**: `occurrencesOf(agendamento, equipe)` — a expansão de um agendamento
  em visita e reunião estava copiada em quatro métodos
- **CHANGE**: **3 `any` → 0** no backend, **11 → 0** no frontend
- **REMOVE**: `GET /attendance/leader/shelters-teams-members`, que chamava o
  mesmo método de `leader/teams/members` e não era consumido por código algum

### 🖥️ Frontend

- **CHANGE**: `api.ts` — parâmetros pelo `params` do axios, não por
  `URLSearchParams` montado à mão em três funções, cada uma esquecendo um campo
  diferente
- **CHANGE**: `getSheltersTeamsMembers` agrupava a hierarquia no cliente a
  partir da lista plana, enquanto o endpoint que já devolve a árvore ficava sem
  uso; agora usa o endpoint certo
- **REMOVE**: `getTeamAttendanceOverview`, `listTeams`, `getLeaderTeamsMembers`
  e `listShelterSchedules` — nenhuma consumida
- **REMOVE**: `RegisterTeamAttendance.tsx` (400 linhas), sem nenhum import no
  projeto; quem registra a frequência da equipe é `TeamMemberAttendance`
- **ADD**: `attendanceErrorMessage` — `catch (err: any)` seguido de
  `err?.response?.data?.message` aparecia onze vezes, com fallbacks diferentes
- **CHANGE**: `AttendanceFiltersQuery` declara `category`, `scheduleId` e
  `memberName`, que a tela já enviava fora do tipo

### 🧪 Testes e documentação

- **ADD**: 118 testes no backend (7 suítes) — o módulo não tinha **nenhum**.
  Cobertura: **96.6% stmts / 97% linhas**
- **ADD**: `orfanatonib-app/e2e/live/attendance.api.spec.ts` (15 cenários) e
  `attendance.ui.spec.ts` (8 cenários). Suíte ao vivo: **95**; mockada: 38
- **CHANGE**: o frontend não tem mais teste unitário; o que vale para tela é
  Playwright contra a pilha real, como a documentação já pedia
- **CHANGE**: `attendance.ui.spec.ts` **monta os próprios dados** pela API no
  `beforeAll` (abrigo, equipe, vínculo do membro e visita no passado) e apaga
  tudo no `afterAll`. A primeira versão pulava quatro cenários em banco vazio —
  e teste que pula não prova nada
- **ADD**: `data-testid` nas telas de frequência e de relatórios pendentes; o
  módulo não tinha **nenhum**
- **CHANGE**: `ATTENDANCE_API_DOCUMENTATION.md` saiu de `src/` para
  `docs/modules/attendance/`
- **ADD**: `docs/modules/attendance/README.md` e
  `docs/diagrams/flow/attendance/attendance-flow.puml` (+ `.png`)
- **VERIFICAÇÃO**: baseline de 26 respostas ao vivo capturado antes do refactor
  e conferido depois — **23 idênticas**, as 3 divergentes sendo o endpoint
  duplicado removido

---

## [2.8.1] - 2026-09-11 - GERENCIAMENTO DE FEATURE FLAGS 🎚️

- **ADD**: painel administrativo completo no frontend em
  `/adm/feature-flags`, com criação, edição, exclusão, alternância, busca,
  filtros, ordenação, paginação, estatísticas e sincronização do catálogo
- **ADD**: `GET /feature-flags/map`, recortado pelo papel obtido do token
  opcional; visitantes recebem somente flags públicas
- **CHANGE**: listagem completa, detalhe e estatísticas agora exigem admin; o
  frontend deixou de baixar a configuração administrativa para cada usuário
- **ADD**: públicos para todas as combinações de `admin`, `leader` e `member`,
  expostos como `targetRoles` e `audience`
- **ADD**: catálogo de fábrica dos recursos existentes e de cada tipo de
  e-mail, conferido no boot e por `POST /feature-flags/seed`
- **CHANGE**: serviços separados por operação e respostas convertidas para
  DTOs explícitos; paginação usa o envelope compartilhado `data` + `meta`
- **NOTE**: o público é persistido em `metadata.targetRoles`, que já existia,
  sem alteração de tabela ou migração
- **DOCS**: `docs/modules/feature-flags/README.md` e diagrama do fluxo

---

## [2.8.0] - 2026-09-11 - FEATURE FLAGS REVISADAS 🎚️

### 🔴 Exposição pública do catálogo

- **FIX**: `GET /feature-flags/map` e `/check/:key` não têm guard — e devolviam
  **todas** as flags a um visitante anônimo, inclusive as operacionais de e-mail
  e o fato de a chave-mestra `email-delivery` estar desligada. Toda chave com
  prefixo `email-` passou a ser interna (`isInternalFeatureFlag`) e some do mapa
  público; segue administrável pelo painel, que é autenticado
- **FIX**: `getFlagsMap` fazia `findAll()` sem cache. É a consulta que toda
  carga da aplicação dispara, **sem autenticação** — agora é memorizada por
  papel, com o mesmo TTL de 60 s

### 🎚️ Duplicidade de interruptores

- **REMOVE**: `event-email-notifications`, o interruptor legado dos avisos de
  evento, que convivia com `email-event-notice` fazendo o mesmo — com padrões
  opostos, de forma que desligar só um não surtia efeito. Entrou em
  `RETIRED_FEATURE_FLAGS` e é removido do banco na conferência do catálogo
- **CHANGE**: `EventNotificationHelper` deixou de consultar feature flag; o
  gate é o do `EmailDispatchService`, junto com a chave-mestra
- **REMOVE**: `isSwitchedOn`, alias de `isEnabledOrDefault` sem nenhum uso

### 🧪 Testes

- **ADD**: 55 testes novos no módulo — repositório, guard, decorador, DTOs,
  conferência do catálogo, mapa público e cache. Cobertura do módulo:
  **68% → 93.9% stmts / 95.2% linhas**
- **ADD** (frontend): `featureFlagsSlice.test.ts` e
  `featureFlagsSelectors.test.ts` (Vitest) — o slice não tinha teste nenhum, e é
  ele que decide rota e menu
- **ADD** (frontend): `e2e/live/feature-flags.ui.spec.ts` — 7 cenários: cria uma
  flag pela tela e confere na API, alterna e confere, membro não alcança o
  painel, e o mapa público não expõe as operacionais

### 📚 Documentação

- **ADD**: `docs/modules/feature-flags/README.md` e
  `docs/diagrams/flow/feature-flags/feature-flags-flow.puml` (+ `.png`)
- **CHANGE**: `orfanatonib-app/docs/feature-flags.md` — seção de testes e a
  distinção entre flags de interface e operacionais

### ℹ️ Correção de atribuição

O erro de boot `DataTypeNotSupportedError` relatado antes vinha da coluna
`environment` declarada como `string | null` sem `type` explícito: o
`design:type` de uma união é `Object`. Corrigido em `[2.7.x]` com
`type: "varchar"`. A varredura confirmou que era a única coluna do projeto nessa
situação.

---

## [2.7.0] - 2026-09-11 - DISPARO POR WHATSAPP/TWILIO REMOVIDO 📵

### 🗑️ Removido

- **REMOVE**: `src/infrastructure/twilio/` (módulo e serviço) e a dependência
  `twilio` do `package.json`
- **REMOVE**: `NotificationService.sendContactWhatsApp` e
  `buildWhatsappMessage`. O contato pelo site agora notifica a coordenação
  **só por e-mail**
- **REMOVE**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
  e `TWILIO_WHATSAPP_TO` dos cinco arquivos de env e dos dois workflows de
  deploy (as secrets correspondentes podem ser apagadas no GitHub)
- **REMOVE**: as constantes de log de WhatsApp em `notification.constants.ts` e
  `contact.constants.ts` — todas sem uso depois da remoção
- **CHANGE**: `README.md` não lista mais "Messaging: Twilio (WhatsApp)" no stack

### ℹ️ O que NÃO foi removido

Os links `wa.me` do frontend (`buildWhatsappLink`, usado nas telas de usuários,
líderes, membros, acolhidos e abrigos) **continuam**. Abrir uma conversa que a
pessoa envia é diferente de disparar mensagem por API: os botões são uma
afordância da interface, não notificação automática.

`AGENTS.md` ainda cita "Twilio" como exemplo genérico de integração externa na
regra de providers — é ilustração, não uso.

---

## [2.6.0] - 2026-09-11 - TEMPLATES DE E-MAIL E NOTIFICAÇÕES 📧

### 🔴 Bloqueios corrigidos

- **FIX**: **produção não enviava e-mail nenhum** — e pior, não subia.
  `env/prod.env` não tinha `GMAIL_SMTP_USER` nem `GMAIL_SMTP_APP_PASSWORD`, e o
  `GmailSmtpProvider` lia as duas **no construtor** via `getRequiredEmailConfig`,
  que lança. A credencial passou a ser lida no primeiro envio: sem ela a API
  sobe normalmente e o e-mail fica na fila com erro de configuração
- **FIX**: **o logo nunca aparecia** nos e-mails de senha. O template lia
  `APP_LOGO_URL`, que não existia em env nenhum — só `CONTACT_EMAIL_LOGO_URL`,
  usado pelo template de contato. A primeira agora vale para todos, com a
  segunda como retrocompatibilidade
- **FIX**: **`env/staging.env` não existia**, embora `app.module.ts` já mapeasse
  `ENVIRONMENT=staging` para ele — subir em staging caía no env local. Criado,
  com os valores em branco de propósito
- **ADD**: `GMAIL_SMTP_*`, `EMAIL_FROM_NAME`, `APP_URL` e `APP_LOGO_URL` nos
  cinco arquivos de env (`env/` é gitignored; os valores ficam em branco)

### ✉️ Base de templates

- **ADD**: `EmailTemplateKey` + `EmailTemplateDataMap` + `EMAIL_TEMPLATES` —
  catálogo tipado onde a chave e os dados andam juntos: passar o payload de um
  template em outro **não compila**
- **ADD**: `templates/layout/email-layout.ts` — moldura e blocos (botão, lista
  rótulo/valor, citação, destaque), com `escapeHtml` em tudo que vem do usuário
- **ADD**: `constants/email-theme.constants.ts` — a paleta estava declarada como
  `const` **dentro** do método `generate`, o que impedia qualquer reaproveitamento;
  foi assim que contato e evento acabaram com paletas próprias
- **CHANGE**: o HTML saiu de dentro do `NotificationService`, onde os e-mails de
  senha eram strings no meio do método
- **REMOVE**: `src/shared/email-template-generator.ts`,
  `communication/contact/templates/email.template.ts` (cópia divergente da que
  estava em uso) e os três templates antigos — ~240 linhas sem referência
- **ADD**: `GET /email-previews` (+ `/:key` e `/:key/text`), só admin — revisar
  um template exigia provocar o acontecimento real e abrir a caixa de entrada.
  A amostra de cada template é obrigatória em tempo de compilação, então o
  preview nunca fica para trás do catálogo

### 📬 Fila de saída e auditoria

- **ADD**: tabela `email_outbox` e `EmailOutboxWorker` (`@Cron` a cada minuto).
  O request grava a intenção e responde; a entrega é do worker, com backoff de
  60 s dobrando até 1 h e 5 tentativas. Antes o envio era síncrono dentro do
  request e uma falha virava só uma linha de log
- **ADD**: `dedupeKey` — é o que permite o agendador rodar todo dia sem
  transformar uma pendência em cobrança diária
- **ADD**: uma linha por destinatário: uma caixa recusada não impede as outras

### 🎚️ Feature flags de e-mail

- **ADD**: `email-delivery` (chave-mestra) e `email-<template>` por tipo
- **ADD**: `FeatureFlagsService.isEnabledOrDefault` — `isEnabled` devolve
  `false` para flag inexistente, o que **desligaria a recuperação de senha** num
  banco sem as linhas. Agora o padrão é explícito de quem chama
- **CHANGE**: e-mail barrado por flag fica registrado como `skipped`: desligar o
  envio não apaga o rastro de que a aplicação quis avisar alguém
- **CHANGE**: `scripts/seed-local-credentials.js` cria `email-delivery`
  **desligada** no local — sem isso, rodar os testes dispararia e-mail de
  verdade, porque `env/local.env` tem credencial real do Gmail

### 🔔 Notificações que faltavam

- **ADD**: **confirmação de e-mail** — tabela `email_verification_tokens`,
  coluna `users.emailVerifiedAt`, `POST /auth/verify-email` e
  `POST /auth/resend-verification`. O cadastro dispara o link; o login de quem
  não confirmou devolve `emailVerification`, campo que o `authSlice` do
  frontend **já esperava havia tempo** sem a API nunca enviar
- **ADD**: **conta aprovada** — o admin ativava a conta e o usuário só
  descobria ao tentar entrar de novo
- **ADD**: **feedback do site** e **comentário** para a coordenação — nenhum dos
  dois gerava aviso: ficavam só na tabela
- **ADD**: **vínculo de equipe alterado**
- **ADD**: **lembretes** de pagela e de relatório de visita
  (`src/shelter/reminders/`, `@Cron` diário às 9h). O de pagela só cobra se
  alguma pagela já foi lançada naquela visita: nenhuma pode significar que a
  visita não ocorreu

### 🧹 Camadas

- **FIX**: `NotificationService` importava o enum de ações e as mensagens de
  `content/event`. Quem decide o texto agora é o módulo de eventos
- **ADD**: `GetUsersService.findAdminEmails()` — contato, feedback e comentários
  alcançavam o `UserRepository` direto
- **CHANGE**: `@nestjs/schedule` fixado em `^6.1.3`. A 12 é **ESM puro** e
  quebrava tanto o Jest quanto o runtime CommonJS da aplicação

### 🖥️ Frontend

- **CHANGE**: `/verificar-email` mostrava instruções da **verificação de
  identidade do AWS SES em sandbox** — pedia para procurar um e-mail da Amazon.
  A API migrou para SMTP do Gmail; a tela agora descreve o fluxo real e tem
  reenvio
- **ADD**: `/verificar-email/:token` — destino do link, confirma e informa que a
  aprovação da coordenação ainda é necessária

### 🧪 Testes e documentação

- **ADD**: 122 testes novos (templates, outbox, worker, dispatch, verificação de
  e-mail, lembretes). Suíte da API: 67 suítes, 708 testes
- **ADD**: `orfanatonib-app/e2e/live/notifications.api.spec.ts` — 12 cenários.
  Suíte ao vivo: 65 cenários; mockada: 35
- **ADD**: `docs/modules/notifications/README.md` e
  `docs/diagrams/flow/notification/notification-flow.puml` (+ `.png`)
- **DEBT**: o worker roda em todas as instâncias; com mais de uma, duas passadas
  podem pegar a mesma linha. Falta `FOR UPDATE SKIP LOCKED` ou coluna de posse —
  hoje a aplicação roda em instância única

---

## [2.5.0] - 2026-09-11 - MÓDULO AUTH NO PADRÃO 🔐

### 🐞 Defeitos corrigidos

- **FIX**: **o refresh token não rotacionava de verdade**. As claims eram sempre
  as mesmas (`sub`, `email`, `role`) e o `iat` tem resolução de um segundo: duas
  emissões no mesmo segundo produziam **a mesma string**, então o token anterior
  continuava valendo e a rotação não invalidava nada. Cada refresh agora carrega
  um `jti` único. Encontrado pela suíte ao vivo
- **FIX**: `AuthService.buildMeResponse` — **107 linhas de código morto**.
  Duplicava a árvore `usuário → perfil → equipe → abrigo → endereço` que `getMe`
  montava inline, e as duas cópias já divergiam. Ninguém chamava
- **FIX**: `GoogleLoginService` — o `try` do login Google envolvia também a
  escrita no banco, então **uma falha de banco era devolvida como
  `401 Google authentication failed`**. Agora só a verificação da credencial
  fica no bloco
- **FIX**: `extractBearerToken` — `header.split(" ")` deixava
  `"Bearer  token"` (dois espaços) sem token
- **FIX**: `auth.module.ts` tinha
  `require('../profile/profile.module').ProfileModule` **dentro do array de
  imports** — um `require` em runtime para driblar um ciclo. O ciclo é real
  (`ProfileModule` importava `AuthModule` sem `forwardRef`); os dois lados agora
  usam `forwardRef`, que é o mecanismo do próprio Nest

### 🏗️ Refatoração de `src/core/auth`

- **CHANGE**: `services/auth.service.ts` (519 linhas, sete casos de uso) dividido
  em `LoginService`, `GoogleLoginService`, `AuthTokenService`, `RegisterService`
  e `GetMeService`
- **REMOVE**: `auth.repository.ts` — encaminhamento puro para
  `UserRepository.findByEmail`, com a assinatura `validateUser(email, password)`
  que **ignorava a senha**: quem comparava o hash era o serviço
- **CHANGE**: o auth não alcança mais repositório de outro módulo. Contratos
  adicionados nos módulos donos: `GetUsersService.findByIdOrNull` e
  `findWithProfiles`, `UpdateUserService.setRefreshToken`,
  `MemberProfilesService.assignTeamForUser`. Dados pessoais e preferências vêm
  de `GetOneProfileService`, que já devolvia exatamente essa forma — a
  normalização de data estava duplicada nos dois módulos
- **CHANGE**: **22 `any` → 0**. Inclui `(data as any).teamId` (o campo já estava
  declarado nos dois DTOs), `error: any` nos catches e o `as any` do `expiresIn`,
  agora estreitado em um helper único
- **CHANGE**: `dto/me-response.dto.ts` reescrito — o anterior descrevia uma
  resposta que o endpoint **nunca devolveu** (`shelters` no perfil de líder, sem
  imagem, sem dados pessoais, sem preferências) e não era importado por ninguém
- **CHANGE**: `role-guard.ts` — dois guards quase idênticos, cada um com um
  `Reflector` e um `Logger` nunca usados, passam a derivar de uma base comum
- **ADD**: `POST /auth/google` e `POST /auth/refresh` ganham DTO
  (`@Body() body: { token: string }` era o contrato anterior). A validação é
  deliberadamente opcional: token ausente responde `401`, como antes, e não `400`
- **ADD**: `constants/`, `types.ts`, `mappers/`, `utils/`

### ❗ Erros

- **ADD**: `UnauthenticatedException` (401) e `ResourceConflictException` (409)
  no catálogo compartilhado
- **FIX**: o campo `error` do envelope repetia a categoria (`"RULE"`,
  `"BUSINESS"`) em vez do nome HTTP que o `docs/ERROR_HANDLING_GUIDE.md`
  documenta. `AppException` ganhou um override opcional e todas as subclasses
  passaram a emitir `"Bad Request"`, `"Not Found"`, `"Forbidden"`,
  `"Unauthorized"`, `"Conflict"`, `"Unprocessable Entity"`,
  `"Too Many Requests"` e `"Internal Server Error"`.
  **Afeta toda a API** — o `statusCode`, a `message` e a `category` não mudaram,
  e o frontend não lê o campo `error`
- **CHANGE (contrato)**: `POST /auth/register` com e-mail já cadastrado
  respondia **`401 Unauthorized`**; agora responde **`409 Conflict`** — é o
  próprio exemplo de 409 no guia. `POST /auth/complete-register` com cadastro já
  concluído respondia `404`; agora também `409`. O frontend exibe
  `response.data.message` e não depende do status nessas rotas

### 🧪 Testes e documentação

- **ADD**: 15 suítes e 141 testes para o módulo — o auth tinha **1 spec**
  (recuperação de senha). Cobertura: **96.1% stmts / 100% branches / 95.7% linhas**
- **ADD**: `orfanatonib-app/e2e/live/auth.api.spec.ts` — 14 cenários contra a API
  e o MySQL reais, incluindo rotação e invalidação de refresh.
  Suíte ao vivo: 53 cenários; mockada: 35; unitários: 596. Todos verdes
- **ADD**: `docs/diagrams/flow/auth/auth-flow.puml` (+ `.png`)
- **CHANGE**: `docs/modules/auth/README.md` reescrito
- **DEBT**: `POST /auth/forgot-password` responde `400 "Email não encontrado"`
  para e-mail sem conta, o que permite **enumerar quais e-mails existem**.
  Fechar isso tira o retorno de quem errou de digitação: é decisão de produto e
  ficou como está, registrada no README do módulo

---

## [2.4.0] - 2026-09-11 - MÓDULO SHELTERS NO PADRÃO 🏠

### 🏗️ Refatoração completa de `src/shelter/shelter`

- **FIX**: havia **três grafias de `entityType`** para a rota do abrigo
  (`shelterPage`, `ShelterPage`, `ShelterEntity`), gravadas por caminhos
  diferentes. A consulta de exclusão não casava com o que a criação escrevia.
  Agora existe uma constante só: `SHELTER_ROUTE_ENTITY_TYPE`
- **FIX**: `UpdateShelterDto.teamsQuantity` tinha `@IsNumber()` duplicado
- **REMOVE**: `dto/create-shelter-request.dto.ts`, `dto/update-shelter-request.dto.ts`,
  `dto/update-shelter-media-request.dto.ts`, `dto/shelter-equipe-response.dto.ts`,
  `dto/shelter-quantidade-equipes-response.dto.ts` (duplicata exata de
  `shelter-teams-quantity-response.dto.ts`) e `enums/weekday.enum/` — seis
  arquivos sem nenhuma referência no código
- **CHANGE**: `SheltersRepository` **deixa de ser exportado** pelo módulo.
  `LeaderProfilesService` passa a usar o contrato
  `GetSheltersService.findShelterIdsForLeader(userId)`
- **CHANGE**: `update-shelters.service.ts` 517 → 134 linhas;
  `shelters.repository.ts` 559 → 657 (com os tipos das linhas cruas explícitos)
- **CHANGE**: **56 `any` → 0** no módulo

### 🐞 Três defeitos que só a verificação ao vivo mostrou

- **FIX**: `DELETE /shelters/:id` **nunca removia o abrigo**. O serviço apagava a
  rota antes de chamar o repositório, e `shelters.routeId` é `ON DELETE CASCADE`
  — apagar a rota levava o abrigo junto, e o `deleteById` seguinte respondia
  `404 Shelter not found`. A remoção inteira passou para a transação do
  repositório, na ordem que as FKs exigem: abrigo → rota → endereço
  (o endereço é `RESTRICT`, só sai depois do abrigo)
- **FIX**: `POST /shelters` com mídia respondia **500 "Database operation
  failed"**. `media_items.title` e `media_items.description` são `NOT NULL`, mas
  o payload os traz opcionais. O default agora vive em `ShelterMediaService`,
  dono da mídia do abrigo — nenhum caminho de escrita grava a foto sem eles
- **FIX**: a resposta do `POST /shelters` não trazia a foto principal, embora o
  `PUT` trouxesse. A criação também anexa a mídia antes de responder

### 🧹 Camadas

- **CHANGE**: `SheltersRepository` não injeta mais `AwsS3Service` nem o
  repositório de `MediaItemEntity` — S3 em repositório é violação de camada, e a
  mídia já pertence a `ShelterMediaService`

### 🧩 Novos colaboradores

- **ADD**: `ShelterMediaService` — a foto do abrigo e as fotos de perfil das
  equipes, cada grupo em **uma consulta**, com a mais recente vencendo
- **ADD**: `ShelterRouteService` — toda a rota pública num lugar só
- **ADD**: `ShelterTeamsService` — numeração e reconciliação das equipes,
  com a mesma validação na criação e na atualização
- **ADD**: `constants.ts`, `types.ts`, `mappers/shelter.mapper.ts`,
  `utils/shelter-access.util.ts`, `utils/shelter-payload.util.ts`,
  `utils/shelter-transform.util.ts`

### 🔐 Escopo e erros

- **CHANGE**: o ator vem do token via `toShelterAccessContext(request)`;
  os casos de uso recebem `ShelterAccessContext` e não conhecem HTTP
- **CHANGE**: abrigo fora do escopo do ator responde **404**, não 403
- **CHANGE**: membro e ator sem papel recebem `AccessDeniedException` (403) nas
  rotas administrativas e de escrita

### 🧪 Testes e documentação

- **ADD**: 14 suítes para o módulo — controller, os quatro casos de uso, os três
  colaboradores, repositório, mappers e utils. O módulo tinha **0 testes**.
  Cobertura: **97.8% stmts / 91.3% branches / 98.1% linhas**.
  Suíte completa da API: 47 suítes, 462 testes, verdes
- **ADD**: `src/shelter/shelter/shelter.fixtures.ts`
- **ADD**: `orfanatonib-app/e2e/live/shelters.api.spec.ts` — 16 cenários contra a
  API, o MySQL e o S3 locais de verdade. Suíte ao vivo: 39 cenários, verdes
- **ADD**: `docs/diagrams/flow/shelter/shelter-flow.puml` (+ `.png`)
- **CHANGE**: `docs/modules/shelters/README.md` reescrito — o anterior
  documentava `PATCH /shelters/:id` (a rota é `PUT`) e um relacionamento
  `Shelter → LeaderProfile (N:1)` que não existe: os líderes ficam nas equipes

---

## [2.3.1] - 2026-09-11 - VALIDAÇÃO VOLTA A RESPONDER 400 🛠️

### 🐞 Correção crítica e global
- **FIX**: `src/main.ts` — o `exceptionFactory` do `ValidationPipe` global
  devolvia um **objeto simples** em vez de uma exceção. O Nest lança o que essa
  função retorna, e um objeto cru não é classificável pelo `GlobalExceptionFilter`:
  **toda falha de validação de DTO na API inteira respondia `500 "Unknown error
  occurred"`**, não `400`.
  Agora devolve `RuleException`, e a resposta volta a ser o que o
  `docs/ERROR_HANDLING_GUIDE.md` documenta:

  ```json
  {
    "statusCode": 400,
    "message": "Validation failed",
    "category": "RULE",
    "details": [{ "field": "email", "constraints": { "isEmail": "..." } }]
  }
  ```

  Afeta todos os módulos. Encontrado pela suíte e2e ao vivo, ao enviar
  `?testament=GOSPEL` em `/visit-material-pages`.

### 🌱 Ambiente local
- **ADD**: `scripts/seed-local-credentials.js` e `npm run seed:local` — cria de
  forma idempotente as contas `e2e.admin`, `e2e.leader` e `e2e.member`
  (senha `E2e@12345`) e liga as feature flags locais. Chamado automaticamente
  por `./run.sh local`; só age em ambiente local
- **ADD**: `MediaItemRepository.findById` e `MediaItemProcessor.findMediaItemById`

---

## [2.3.0] - 2026-09-11 - MÓDULO VISIT MATERIAL PAGES NO PADRÃO 📚

Refatoração completa de `src/content/page/visit-material-page/` para o padrão de
`AGENTS.md` + `docs/ORFANATO_BACKEND_BEST_PRACTICES.md`.

### 🏗️ Arquitetura
- **RENAME**: serviços em PascalCase (`VisitMaterialsPageCreateService.ts`)
  passam a seguir `<operação>-visit-material-page.service.ts`
- **SPLIT**: `VisitMaterialsPageUpdateService` (607 linhas, 16 métodos privados
  quase idênticos) colapsado — os quatro acervos de mídia agora compartilham uma
  única rotina parametrizada pelo `MediaType`, em
  `services/visit-material-media.service.ts` (227 l.)
- **ADD**: `set-current-visit-material-page.service.ts` separa a promoção do
  material atual do serviço de leitura
- **ADD**: `constants.ts`, `types.ts`, `enums/`, `mappers/`, `utils/` e
  `repositories/` dedicados
- **MOVE**: `TestamentType` sai da entidade para `enums/testament-type.enum.ts`
- **MOVE**: `VisitMaterialsPageResponseDTO.fromEntity` sai do DTO para
  `mappers/visit-material-page.mapper.ts`
- **REMOVE**: 10 ocorrências de `any` no módulo → zero
- **FIX**: nenhum serviço fala TypeORM. `DataSource`/`QueryRunner` saíram dos
  serviços; a transação vive em `VisitMaterialsPageRepository.runInTransaction`
- **FIX**: o parse e a validação do campo multipart `visitMaterialsPageData`
  saem do serviço para o controller (`parseVisitMaterialPayload`), que é onde
  mora a preocupação de transporte
- **ADD**: `MediaItemProcessor.findMediaItemById` e `MediaItemRepository.findById`
  (aditivos), para o módulo inspecionar a mídia armazenada sem tocar TypeORM
- **REMOVE**: blocos `if/else` vazios em três serviços

### 🐞 Correções de comportamento
- **FIX**: `GET /current-material` devolvia a entidade crua (sem mídia) ou
  `{ message: '...' }` quando não havia material atual. Agora devolve
  `VisitMaterialsPageResponseDTO` ou `null` — **que é o que a documentação já
  descrevia**. O `getCurrentMaterial()` do frontend nunca conseguia detectar a
  ausência de material, porque `{ message }` é truthy
- **FIX**: `POST /current-material/:id` não devolvia corpo, apesar de a
  documentação prometer o DTO da página promovida. Agora devolve
- **FIX**: `DELETE /:id` de página inexistente respondia `400`; agora responde
  `404`, como a documentação já previa. A exceção de aplicação deixa de ser
  engolida e reescrita como erro genérico
- **FIX**: falha de infraestrutura em create/update/delete respondia `400`;
  agora é `ProcessException` (`500`), separando erro do cliente de erro do
  servidor
- **FIX**: um item enviado com `uploadType: 'upload'` e `isLocalFile: false`
  era gravado como não-local mesmo tendo ido para o S3, e escapava da limpeza de
  arquivos na exclusão. O upload agora sempre marca `isLocalFile: true`
- **FIX**: o `mediaType` enviado pelo cliente sobrescrevia o tipo do acervo — um
  item dentro de `videos` podia ser gravado como `image`. O acervo agora é
  autoritativo
- **ADD**: `:id` validado como UUID nas rotas que o recebem

### ⚡ Desempenho
- **FIX**: o update lia a mídia da página quatro vezes (uma por acervo); agora lê
  uma vez e agrupa por tipo
- **FIX**: a listagem não consulta mídia quando não há página no resultado

### 🧪 Testes
- **ADD**: 119 testes Jest (o módulo tinha zero)
- Cobertura do escopo: **94,95% statements / 97,80% branches / 98,73% funções**

### 📚 Documentação
- **ADD**: `docs/modules/visit-material-pages/README.md`
- **ADD**: `docs/diagrams/flow/visit-material-page/` (`.puml` + `.png`)
- **SYNC**: seção de códigos de erro de `docs/MODULO_MATERIAIS_VISITA.md`
  (400/404/500) com o envelope e os status reais

---

## [2.2.1] - 2026-09-11 - E-MAIL VIA GMAIL SMTP ✉️

- **REMOVE**: integração, dependência, configuração e verificação de
  destinatários da integração anterior de e-mail da AWS.
- **ADD**: provider Gmail SMTP via Nodemailer, com TLS, timeouts, repetição de
  falhas transitórias e tradução para a exceção padronizada `PROCESS`.
- **CHANGE**: recuperação de senha envia o link diretamente, sem o bloqueio de
  verificação de identidade do sandbox do provider anterior.
- **SECURITY**: logs de e-mail deixam de registrar destinatários, credenciais e
  respostas brutas do provider.
- **DOCS**: guia de configuração e diagrama do fluxo de e-mail adicionados.

---

## [2.2.0] - 2026-09-10 - MÓDULO SHELTERED NO PADRÃO 🧱

Refatoração completa de `src/shelter/sheltered/` para o padrão obrigatório de
`AGENTS.md` + `docs/ORFANATO_BACKEND_BEST_PRACTICES.md`.

### 🏗️ Arquitetura
- **SPLIT**: `sheltered.service.ts` (216 linhas, na raiz do módulo) dividido em
  `create-`, `get-`, `update-` e `delete-sheltered.service.ts` sob `services/`
- **ADD**: `sheltered-shelter-access.service.ts` centraliza a autorização do
  vínculo acolhido → abrigo (antes duplicada em create e update)
- **ADD**: `constants.ts`, `types.ts`, `enums/` e `utils/` dedicados
- **REMOVE**: 22 ocorrências de `any` no módulo → zero
- **FIX**: serviços não recebem mais `Request`; o controller resolve o ator via
  `AuthenticatedRequest` (`request.user`, populado pelo `JwtAuthGuard`), sem
  reverificar o JWT a cada chamada

### 🔐 Autorização
- **ADD**: enum `UserRole` no lugar das strings `'admin' | 'leader' | 'member'`
- **ADD**: papel desconhecido no token degrada para `null` (sem escopo)
- **CHANGE**: abrigo inexistente **ou fora do escopo** agora responde `404`
  (antes `403` no caso de escopo), conforme §11.2 — não vaza a existência do
  registro. Mensagem: "Abrigo não encontrado ou fora do seu acesso."
- **ADD**: `GetSheltersService.existsForActor(id, ctx)` — contrato sem `Request`
  para consumo por outros módulos

### 📡 Contrato da API
- **ADD** (aditivo) em `GET /sheltered`: `shelterSearchingString`, `addressFilter`,
  `gender`, `birthDateFrom`, `birthDateTo`, `joinedFrom`, `joinedTo`.
  Esses filtros já eram enviados pelo frontend e pela collection Postman, mas
  não existiam no `QueryShelteredDto` — com `forbidNonWhitelisted: true` a
  listagem retornava **400 Validation failed** sempre que um filtro era usado
- **ADD**: `limit` máximo de 100 (antes ilimitado)
- **ADD**: ordenação secundária por `id` (paginação determinística)
- **ADD**: envelope paginado compartilhado em
  `src/shared/dto/paginated-response.dto.ts`
- **REMOVE**: `pagelas` do `ShelteredResponseDto` — declarado no DTO mas nunca
  preenchido pelo mapper; nunca foi emitido na resposta
- **KEEP**: rotas, verbos, status codes e demais campos inalterados

### ⚠️ Erros
- **ADD**: `ResourceNotFoundException` (404 + categoria `BUSINESS`) em
  `src/common/exceptions/`, no lugar do `NotFoundException` genérico do Nest

### 🧪 Testes
- **ADD**: 101 testes Jest (antes o repositório inteiro tinha 1 spec)
- Cobertura do escopo: **92,38% statements / 91,01% branches**
- **FIX**: configuração do Jest — `moduleDirectories` (resolve imports `src/...`)
  e `setupFiles: ["reflect-metadata"]` (specs de DTO com class-validator)

### 📚 Documentação
- **REWRITE**: `docs/modules/sheltered/README.md` (apontava para
  `docs/documentation/SHELTERED_COMPLETE_GUIDE.md`, que não existe)
- **ADD**: `docs/diagrams/flow/sheltered/sheltered-flow.puml` e o script
  `npm run diagrams:generate`
- **SYNC**: collection Postman — `shelteredSearchingString` → `searchString`,
  filtros de `/simple` documentados e `PATCH /:id/status` adicionado

---

## [2.0.0] - 2025-10-23 - REORGANIZAÇÃO COMPLETA ⭐

### 🏗️ Estrutura
- **REORGANIZAÇÃO TOTAL** da pasta `docs/` por módulos
- Criada estrutura `docs/modules/[módulo]/`
- Movidos 50+ arquivos para nova estrutura
- Criado `docs/guides/` para documentação geral

### 🧪 Tests Consolidation
- **UNIFIED** `test/` and `tests/` folders → single `test/` folder
- **CONSOLIDATED** 20+ test files → 6 complete automations (1 per module)
- **ORGANIZED** all tests in `test/automations/{module}/`
- **REMOVED** redundant test files (debug, check, investigate)
- **SIMPLIFIED** JSON results → `results.json` (latest only)
- **REDUCTION**: ~70% fewer test files

### 🔧 Leader Profiles - v6.0.0

#### Backend
- **FIX**: Paginação agora retorna TODOS os leaders por padrão (antes: apenas 1)
- **FIX**: Filtro `hasShelter` só aplica quando explicitamente true/false
- **FIX**: Método `list()` retorna TODOS os leaders (antes: só sem shelter)

#### Collection
- **UPDATE**: 100% sincronizada com DTOs do backend
- **UPDATE**: Estrutura de paginação: `{items, total, page, limit, pageCount}`
- **UPDATE**: Relacionamento ManyToOne: `shelter: {...} | null`
- **ADD**: 8 exemplos detalhados de paginação
- **FIX**: Listagem simples: `{leaderProfileId, name, vinculado}`

#### Validação
```
✅ Paginação sem filtro: 17 leaders (TODOS)
✅ hasShelter=true: 16 leaders  
✅ hasShelter=false: 1 leader
✅ Listagem simples: 17 leaders
```

### 📚 Documentação
- **ADD**: `docs/README.md` - Documentação principal atualizada
- **ADD**: `docs/INDEX.md` - Índice completo com links
- **ADD**: `docs/modules/leader-profiles/README.md` - Exemplo completo
- **ADD**: `docs/CHANGELOG.md` - Este arquivo (consolidação de logs)

### 🗑️ Limpeza
- **REMOVE**: 11 pastas desorganizadas antigas
- **CONSOLIDATE**: Múltiplos MDs de resumo → CHANGELOG.md
- **MOVE**: Collections para `modules/[módulo]/`
- **MOVE**: Documentação para `modules/[módulo]/`

---

## [1.5.0] - 2025-09-30

### 🏠 Shelters
- **ADD**: Sistema de Media Items (fotos)
- **ADD**: Relacionamento com leaders e members
- **UPDATE**: Estrutura de endereços melhorada

### 👩‍🏫 Member Profiles
- **ADD**: Especializações de professores
- **ADD**: Vinculação a shelters
- **REFACTOR**: Filtros consolidados

### 👶 Sheltered
- **UPDATE**: Campos opcionais (guardianName, guardianPhone)
- **FIX**: Validação de gender (M/F)
- **ADD**: Relacionamento com pagelas

---

## [1.0.0] - 2025-09-27 - RELEASE INICIAL

### 🔐 Auth
- **ADD**: Sistema de autenticação JWT
- **ADD**: Login e refresh token
- **ADD**: Controle de acesso por roles (admin, leader, member)

### 👥 Users
- **ADD**: CRUD completo de usuários
- **ADD**: Filtros (role, status, busca)
- **ADD**: Controle de visibilidade (active)
- **ADD**: Paginação e ordenação

### 🏠 Shelters
- **ADD**: CRUD de abrigos
- **ADD**: Sistema de endereços
- **ADD**: Filtros por localização

### 👨‍💼 Leader Profiles
- **ADD**: Gestão de perfis de líderes
- **ADD**: Vinculação a shelters (ManyToOne)
- **ADD**: Operações de atribuição/movimentação

### 👩‍🏫 Member Profiles
- **ADD**: Gestão de perfis de professores
- **ADD**: Vinculação a shelters

### 👶 Sheltered
- **ADD**: Gestão de abrigados
- **ADD**: Dados pessoais e responsáveis
- **ADD**: Filtros por idade, gênero, shelter

### 📝 Pagelas
- **ADD**: Sistema de relatórios
- **ADD**: Vinculação a sheltered e members
- **ADD**: Filtros por ano, visita, presença

### 🧪 Automações
- **ADD**: Automação completa para todos os módulos
- **ADD**: `tests/automations/[módulo]/[módulo]-complete-automation.js`
- **ADD**: Validação de CRUD, filtros, paginação

### 📚 Documentação
- **ADD**: Collections Postman para todos os módulos
- **ADD**: Documentação de APIs
- **ADD**: Environments Postman

---

## Legenda

- **ADD**: Nova funcionalidade
- **UPDATE**: Atualização de funcionalidade existente
- **FIX**: Correção de bug
- **REFACTOR**: Refatoração de código
- **REMOVE**: Remoção de código/arquivo
- **CONSOLIDATE**: Consolidação de múltiplos arquivos
- **MOVE**: Movimentação de arquivos

---

## 📊 Estatísticas do Projeto

### Módulos
- 7 módulos principais
- 7 collections Postman
- 7 automações completas

### Código
- ~50 arquivos de código modificados
- ~100 endpoints documentados
- 1 collection 100% sincronizada (Leader Profiles v6.0.0)
- 6 collections pendentes de atualização

### Documentação
- 43 arquivos MD (será consolidado)
- 7 READMEs de módulos
- 1 README principal
- 1 INDEX completo

---

**Última atualização**: 23 de Outubro de 2025  
**Versão atual**: 2.0.0  
**Status**: 🚀 Em desenvolvimento ativo

## 2026-11-18 — Content Studio category selection

- Package creation accepts an optional audience; legacy four-track requests remain compatible.
- Catalog exposes Baby, Crianças, Adolescentes and Adultos with `allAudiencesRequired: false`.
