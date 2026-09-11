# 📧 Notificações e E-mail

Tudo que a aplicação envia: templates, fila de saída, feature flags e os
gatilhos de cada aviso.

- **Configuração SMTP**: [`docs/guides/GMAIL_SMTP_CONFIGURATION.md`](../../guides/GMAIL_SMTP_CONFIGURATION.md)
- **Diagrama de fluxo**: [`docs/diagrams/flow/notification/notification-flow.puml`](../../diagrams/flow/notification/notification-flow.puml)

---

## 🧭 Como um aviso acontece

```text
módulo de domínio            NotificationService     EmailDispatchService     email_outbox        EmailOutboxWorker
(cadastro, contato, ...)  →  nomeia o fato        →  renderiza + flags     →  grava a linha  →   entrega (a cada minuto)
```

O request **não** fala com o SMTP: ele grava a intenção e responde. A entrega é
do worker, que tenta, reagenda com backoff e desiste depois de 5 tentativas.

Antes o envio era síncrono dentro do request e uma falha virava só uma linha de
log — ninguém sabia o que deixou de chegar.

---

## 📁 Estrutura

```text
src/communication/notification/
├── notification.module.ts
├── types.ts                          # dados de cada template, ligados à chave
├── constants/
│   ├── email.constants.ts            # nome, slogan, rodapé
│   ├── email-theme.constants.ts      # paleta e medidas
│   └── notification.constants.ts     # outbox, lembretes, logs
├── enums/
│   ├── email-template-key.enum.ts    # o catálogo
│   └── email-outbox-status.enum.ts
├── templates/
│   ├── layout/email-layout.ts        # moldura e blocos (botão, lista, citação)
│   ├── auth.templates.ts
│   ├── inbound.templates.ts
│   ├── operations.templates.ts
│   └── email-template.registry.ts    # chave → renderizador, tipado
├── outbox/
│   ├── email-outbox.entity.ts
│   ├── email-outbox.repository.ts
│   ├── email-outbox.service.ts
│   └── email-outbox.worker.ts        # @Cron a cada minuto
├── services/
│   ├── email-dispatch.service.ts     # renderiza, consulta flags, enfileira
│   └── notification.service.ts       # fachada do domínio
└── preview/
    ├── email-preview.controller.ts
    └── email-preview.samples.ts
```

---

## ✉️ Os templates

Onze, todos com dados tipados. A chave e os dados andam juntos: passar o
payload de um template em outro **não compila**.

```ts
await this.dispatcher.dispatch(
  EmailTemplateKey.PASSWORD_RESET,
  { userName, resetLink, ttlMinutes },   // ← só este formato serve aqui
  [user.email],
);
```

| Chave | Quando |
|-------|--------|
| `password-reset` | pedido de recuperação de senha |
| `password-changed` | senha alterada |
| `email-verification` | cadastro criado ou reenvio pedido |
| `account-approved` | coordenação ativa a conta |
| `contact-received` | formulário de contato do site |
| `event-notice` | evento criado, atualizado ou cancelado |
| `feedback-received` | feedback do site |
| `comment-received` | comentário publicado, aguardando revisão |
| `team-assignment-changed` | membro entra ou sai de uma equipe |
| `pagela-reminder` | pagelas pendentes após a visita |
| `visit-report-reminder` | visita sem relatório |

### Escrever um template novo

1. Uma chave em `EmailTemplateKey`.
2. Os dados em `EmailTemplateDataMap` (`types.ts`).
3. O renderizador, compondo os blocos de `templates/layout/email-layout.ts`.
4. A entrada em `EMAIL_TEMPLATES`.
5. Uma amostra em `EMAIL_PREVIEW_SAMPLES` — **sem ela não compila**, então o
   preview nunca fica para trás do catálogo.

O TypeScript cobra os passos 2, 4 e 5.

### Escape

Todo dado do usuário passa por `escapeHtml`. Os blocos `definitionList`,
`quotedText` e a saudação escapam sozinhos; ao interpolar direto num
`paragraph`, escape na mão — há teste cobrindo isso.

---

## 👀 Preview

Revisar um template exigia provocar o acontecimento real e abrir a caixa de
entrada. Agora:

```
GET /email-previews            # lista, com assunto e link de cada um
GET /email-previews/:key       # o HTML, direto no navegador
GET /email-previews/:key/text  # a versão texto
```

Só admin, e nada é enviado.

---

## 🎚️ Feature flags

| Flag | Efeito |
|------|--------|
| `email-delivery` | chave-mestra: desligada, **nenhum** e-mail sai |
| `email-<chave do template>` | desliga um tipo (ex.: `email-pagela-reminder`) |

**Flag ausente = ligada.** `isEnabled` devolve `false` para flag inexistente, o
que desligaria a recuperação de senha num banco sem as linhas; por isso o
módulo usa `isEnabledOrDefault(chave, true)`.

O e-mail barrado por flag **fica registrado** no outbox como `skipped`:
desligar o envio não apaga o rastro de que a aplicação quis avisar alguém.

No ambiente local o seed cria `email-delivery` **desligada** — sem isso, rodar
os testes dispararia e-mail de verdade, porque `env/local.env` costuma ter
credencial real do Gmail. O serviço tem cache de 60 s: mudar a flag leva até um
minuto para valer.

---

## 📬 A fila de saída (`email_outbox`)

Uma linha por destinatário — uma caixa recusada não impede as outras, e o
histórico mostra quem recebeu o quê.

| Coluna | Para quê |
|--------|----------|
| `status` | `pending`, `sent`, `failed`, `skipped` |
| `attempts` / `lastError` | quantas tentativas e o motivo da última falha |
| `scheduledFor` | quando tentar; o backoff empurra para frente |
| `dedupeKey` | impede a mesma cobrança duas vezes |

Backoff de 60 s dobrando a cada tentativa, teto de 1 h, 5 tentativas.

O `dedupeKey` é o que permite o agendador rodar todo dia sem transformar uma
pendência em cobrança diária.

---

## ⏰ Lembretes

`src/shelter/reminders/` — ficam no domínio de abrigo, que é quem conhece as
tabelas de visita, pagela e equipe. Uma passada por dia às 9h.

- **Relatório de visita**: visita com data passada (2 dias de carência, janela
  de 30 dias) e sem relatório → líderes da equipe.
- **Pagela**: acolhidos ativos sem pagela na visita mais recente → líderes.
  Só cobra se **alguma** pagela já foi lançada naquela visita: nenhuma pode
  significar que a visita não ocorreu.

---

## ⚙️ Configuração

| Variável | Para quê |
|----------|----------|
| `GMAIL_SMTP_USER` / `GMAIL_SMTP_APP_PASSWORD` | credencial de envio |
| `EMAIL_FROM_NAME` | remetente exibido (padrão: Orfanatos NIB) |
| `APP_URL` | endereço do frontend nos links; sem ela, cai no mapa por ambiente |
| `APP_LOGO_URL` | logo do cabeçalho (aceita `CONTACT_EMAIL_LOGO_URL` como legado) |

**Sem credencial a API sobe normalmente** e o e-mail fica na fila com erro de
configuração. Antes o provider lia a credencial no construtor: um ambiente sem
`GMAIL_SMTP_USER` — o caso de `env/prod.env` — derrubava o boot inteiro.

---

## 🧪 Testes

```bash
npx jest src/communication/notification src/shelter/reminders
npx playwright test --config=playwright.live.config.ts e2e/live/notifications.api.spec.ts
```

---

## 📌 Débitos conhecidos

- O worker roda em **todas** as instâncias. Com mais de uma, duas passadas
  podem pegar a mesma linha: falta um `SELECT ... FOR UPDATE SKIP LOCKED` ou
  uma coluna de posse. Hoje a aplicação roda em instância única.
- Não há tela de administração do outbox; a consulta é por SQL.
- `POST /auth/forgot-password` ainda revela quais e-mails existem (ver o README
  do módulo auth).
