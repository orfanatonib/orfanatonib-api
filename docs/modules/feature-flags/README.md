# 🎚️ Módulo Feature Flags

Interruptores de funcionalidade: o que a interface mostra e o que o servidor
executa. É também o caminho para **religar** um recurso, então o painel nunca é
protegido por uma flag.

- **Diagrama de fluxo**: [`docs/diagrams/flow/feature-flags/feature-flags-flow.puml`](../../diagrams/flow/feature-flags/feature-flags-flow.puml)
- **Lado do frontend**: [`orfanatonib-app/docs/feature-flags.md`](../../../../orfanatonib-app/docs/feature-flags.md)

---

## 📁 Estrutura

```text
src/core/feature-flags/
├── feature-flags.module.ts
├── feature-flags-core.module.ts
├── feature-flags.controller.ts
├── feature-flags.repository.ts
├── constants.ts          # catálogo de fábrica, aposentadas, prefixos internos
├── types.ts              # públicos, ordenação
├── utils.ts              # papéis-alvo, público, decisão por papel
├── mappers.ts            # entidade → DTO
├── dto/
├── entities/feature-flag.entity.ts
├── enums/feature-flag-keys.enum.ts
├── decorators/feature-flag.decorator.ts
├── guards/feature-flag.guard.ts
└── services/
    ├── get-feature-flags.service.ts
    ├── create-feature-flag.service.ts
    ├── update-feature-flag.service.ts
    └── delete-feature-flag.service.ts
```

---

## 🔓 Duas superfícies, com exposições diferentes

| Rota | Guard | Devolve |
|------|-------|---------|
| `GET /feature-flags/map` | — | decisão efetiva das flags **de interface** |
| `GET /feature-flags/check/:key` | — | decisão de uma chave |
| todas as demais | JWT + Admin | catálogo completo, incluindo as internas |

O mapa é público porque o menu e as rotas dependem dele antes do login.

### Estúdio Orfanato

O catálogo inclui cinco flags do Estúdio, todas inicialmente desligadas e
visíveis somente para administradores enquanto a matriz definitiva de papéis
não é aprovada:

- `content-studio`: entrada principal e APIs de consulta;
- `content-studio-generation`: operações de geração e regeneração;
- `content-studio-review`: revisão, comentários e aprovação;
- `content-studio-publication`: publicação de conteúdo aprovado;
- `content-studio-provider-admin`: administração de provedores e modelos.

Essas flags controlam rollout, mas não substituem autenticação, guards de papel
ou verificações de escopo no backend.

**As flags operacionais ficam fora dele.** Toda chave com prefixo `email-` é
interna (`isInternalFeatureFlag`): governa envio no servidor e não é consumida
pela interface. O mapa devolvia o catálogo inteiro a qualquer visitante anônimo
— inclusive que a chave-mestra de e-mail estava desligada.

O mapa é memorizado por papel (TTL de 60 s): é a consulta que toda carga da
aplicação dispara, sem autenticação.

---

## 🎯 Públicos

O público sai de `metadata.targetRoles`, e `utils.ts` converte entre a lista de
papéis e as oito combinações nomeadas (`EVERYONE`, `ADMIN`, `ADMIN_LEADER`,
`ALL_ROLES`, ...).

- Lista **vazia** = qualquer visitante, mesmo sem login.
- `ALL_ROLES` = exige autenticação em um dos três papéis.

`isTargetedForRole` responde `false` para flag desligada, qualquer que seja o
público.

---

## 📖 Como ler uma flag no servidor

| Método | Flag inexistente | Quando usar |
|--------|------------------|-------------|
| `isEnabled(key, env?)` | `false` | recurso que só vale depois de cadastrado |
| `isEnabledOrDefault(key, padrão, env?)` | o padrão informado | recurso que deve vir **ligado** |
| `isEnabledForRole(key, papel)` | `false` | decisão por papel, como no mapa |

A distinção importa: `isEnabled` devolve `false` para flag inexistente, o que
desligaria a recuperação de senha num banco sem as linhas. Os envios de e-mail
usam `isEnabledOrDefault(chave, true)`.

Para proteger uma rota inteira, `@FeatureFlag('chave')` + `FeatureFlagGuard`,
que responde `403` com o nome da funcionalidade.

---

## 📦 Catálogo de fábrica

`DEFAULT_FEATURE_FLAGS` é conferido em **todo boot** (`onModuleInit`) e pelo
`POST /feature-flags/seed`:

- cria o que falta, **sem tocar** no que já existe — o estado escolhido pelo
  operador é preservado;
- remove o que está em `RETIRED_FEATURE_FLAGS`.

Uma falha de banco na conferência não impede a aplicação de subir.

Hoje o catálogo tem **53 flags de interface** (`snake_case`, uma por recurso) e as de e-mail (`email_delivery` + `email_<tipo>`, uma por template). O público de cada flag está em `targetRoles` (vazio = todos, inclusive visitante). As chaves antigas em kebab-case (`shelter-*`, `content-studio*`) ficam no banco só durante o rollout em dois passos (`FEATURE_FLAG_RENAMES` copia o estado para a chave nova; a versão N+1 as move para `RETIRED_FEATURE_FLAGS`).

### Garantias testadas
- `feature-flags.architecture.spec.ts`: **todo handler HTTP tem `@FeatureFlag` ou está em `CORE_UNFLAGGED` com motivo**; entrada obsoleta derruba o teste; todo `EmailTemplateKey` tem flag.
- `flag-audience-sweep.api.spec.ts` (E2E): nenhum `GET` do líder/membro recebe `FEATURE_DISABLED` fora da lista esperada — evita pôr flag de público estreito num handler que o perfil também atende.
- Flag de público estreito em handler compartilhado usa `anyOf` (ex.: `GET /shelter-schedules`: `shelter_schedule` **ou** `member_area`).
- Falha de rede no front mantém o último mapa do servidor; sem resposta anterior vale o padrão do catálogo (a API segue autoridade: 403 `FEATURE_DISABLED`).

### Aposentada

`event-email-notifications` era o interruptor legado dos avisos de evento e
conviveu com `email-event-notice`, que faz o mesmo — dois interruptores para a
mesma coisa, com padrões opostos: quem desligasse só um acharia que não
funcionou. Ficou o do catálogo de e-mail.

---

## 🧪 Testes

```bash
npx jest src/core/feature-flags
npx playwright test --config=playwright.live.config.ts e2e/live/feature-flags.ui.spec.ts
```

12+ suítes, 155 testes (`npx jest --runInBand src/core/feature-flags`).

---

## 📌 Débitos conhecidos

- Com filtro de público, `findAllPaginated` carrega todas as flags e fatia em
  memória: o público vive no `metadata` JSON e não dá para paginar no SQL.
  Irrelevante em 15 linhas; relevante se o catálogo crescer muito.
- O cache é por instância (ver "Cache entre instâncias" abaixo). Sem Redis,
  alternar uma flag leva até 60 s (5 s nas `email_*`) para valer nas demais.

## Catálogo por recurso e imposição na API (planos 08/09)

- **Formato do Clubinho:** uma flag por recurso, em `snake_case`; o perfil nunca
  entra no nome — quem enxerga é decidido por `targetRoles` (vazio = todos,
  inclusive visitante; admin é sempre explícito). 54 flags de interface +
  `email_*` (uma por notificação, mais a chave-mestra `email_delivery`), em
  `constants.ts` (`DEFAULT_FEATURE_FLAGS`) e `enums/feature-flag-keys.enum.ts`.
- **Imposição dupla:** a mesma chave governa a tela (`FeatureFlagRoute`) e a API
  (`@FeatureFlag` + `FeatureFlagGuard`, 125 handlers da matriz `09a`). A flag
  **nunca amplia** acesso: o guard de papel continua soberano.
- **Guard:** resolve o perfil por `request.user` ou, sem ele, pelo token
  (`AuthContextService`), então não depende da ordem dos guards. Aceita
  `"chave"`, `["a","b"]` (todas) e `{ anyOf: ["a","b"] }` (qualquer uma, para
  leituras compartilhadas). Flag ausente do banco vale o **padrão do catálogo**.
  Desligada: 403 com `details.code = "FEATURE_DISABLED"`.
- **Rotas públicas** cujo público da flag não é "todos" ficaram sem `@FeatureFlag`
  (`POST /accepted-christs`, `/image-sections*`, `GET /ideas-pages*`,
  `GET /documents*`): decorá-las derrubaria o acesso de quem hoje entra — ver
  divergências na §4.1 do plano 09.
- **Renomeação sem acidente:** `FEATURE_FLAG_RENAMES` cria a chave nova
  **copiando `enabled` e `targetRoles` da antiga** no boot (`shelter-pagelas`
  gera `sheltered_area` e `pagelas`). Rollout em dois passos: na versão N as
  chaves antigas permanecem (instâncias antigas ainda as leem); na versão N+1
  vão para `RETIRED_FEATURE_FLAGS`. `INTERNAL_FEATURE_FLAG_PREFIXES` cobre
  `email_` e, durante a versão N, também `email-` (não vazam no mapa público).
- **Front:** `FeatureFlagKeys` com as mesmas 54 chaves; `FeatureFlagRoute` em 55
  rotas; o slice ignora resposta de requisição antiga (troca de sessão).

## Escrita segura: versão, idempotência e flag protegida (plano 08, fechamento 2026-11-21)

- `PUT /feature-flags/:key/enabled` `{ enabled, expectedVersion? }` — **estado desejado, idempotente**: repetir não grava nem sobe a versão (200 com a flag atual). Com `expectedVersion`, a escrita é um `UPDATE ... WHERE version = ?` atômico; versão velha = **409** `details.code = FEATURE_FLAG_VERSION_CONFLICT` (`expectedVersion` e `currentVersion` no `details`). `PATCH /:key` também aceita `expectedVersion`. `PATCH /:key/toggle` continua existindo (sem controle de versão).
- Colunas novas em `feature_flags`: `protected` (flag de fábrica; o boot preenche nas linhas antigas) e `version` (`@VersionColumn`, default 1). A resposta traz `protected` e `version`. Renomear/remover flag protegida = **409** `FEATURE_FLAG_PROTECTED` (antes 400). A coluna `environment` foi removida do banco (migration `AddFeatureFlagProtectedVersion`, gerada por `migration:generate`; só toca `feature_flags`).
- `PATCH` com `name`/`enabled`/`key` nulos devolve 400 (antes 500 por violar NOT NULL).

## Cache entre instâncias

- TTL: 60 s para flags de interface; **5 s** para as operacionais (`email_*`, chaves-mestras de envio).
- Invalidação ativa por Redis pub/sub (canal `orfanato:feature-flags:invalidate`) **opcional**: ligada quando `REDIS_URL` existe (a mesma da fila BullMQ); `FEATURE_FLAGS_BUS=memory` a desliga. Sem Redis, ou com Redis fora do ar, nada muda: o cache segue só com TTL e a falha vira `warn` (nunca derruba boot nem escrita). `FeatureFlagsInvalidationBus` ignora o eco das próprias mensagens.

## Painel (app)

Agrupado por área (Site público, Área do membro, Conteúdo e moderação, Pessoas e abrigos, Estúdio, E-mails, Outras) com abas roláveis; selo **Imposta na API** (flag consultada por algum handler/serviço da API — contrato testado contra o código da API), selo **Protegida**, aviso de perfil (`audienceWarning`) no cartão e no formulário, alternar com versão (409 recarrega o painel). O mapa de flags é relido em segundo plano ao voltar o foco da aba (mín. 15 s entre leituras).
