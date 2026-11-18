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

Hoje o catálogo tem 15 flags: 3 de interface (`shelter-*`) e 12 de e-mail
(`email-delivery` + uma por tipo de template).

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

9 suítes e 93 testes. Cobertura: **93.9% stmts / 95.2% linhas**.

---

## 📌 Débitos conhecidos

- Com filtro de público, `findAllPaginated` carrega todas as flags e fatia em
  memória: o público vive no `metadata` JSON e não dá para paginar no SQL.
  Irrelevante em 15 linhas; relevante se o catálogo crescer muito.
- O cache é por instância. Com mais de uma, alternar uma flag leva até 60 s
  para valer nas demais.
