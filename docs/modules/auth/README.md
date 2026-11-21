# 🔐 Módulo Auth (Autenticação)

Entrada no sistema: senha, Google, renovação de sessão, cadastro e recuperação
de senha. É o módulo de que todos os outros dependem — o `JwtAuthGuard` e os
guards de papel vivem aqui.

- **Contrato dos endpoints**: [`Auth_API_Documentation.md`](./Auth_API_Documentation.md)
- **Diagrama de fluxo**: [`docs/diagrams/flow/auth/auth-flow.puml`](../../diagrams/flow/auth/auth-flow.puml)
- **Erros**: [`docs/ERROR_HANDLING_GUIDE.md`](../../ERROR_HANDLING_GUIDE.md)

---

## 📁 Estrutura

```text
src/core/auth/
├── auth.module.ts
├── auth.controller.ts              # só HTTP: DTO de entrada, ator do token
├── auth.types.ts                   # UserRole, JwtPayload, AuthenticatedRequest
├── types.ts                        # claims assinadas, portadores do token
├── constants/
│   ├── auth.constants.ts           # mensagens, logs, alvo de mídia, TTLs
│   └── password-recovery.constants.ts
├── dto/
│   ├── login.dto.ts
│   ├── google-login.dto.ts
│   ├── refresh-token.dto.ts
│   ├── register.dto.ts
│   ├── complete-register.dto.ts
│   ├── forgot-password.dto.ts
│   ├── reset-password.dto.ts
│   ├── auth.response.dto.ts        # saídas de login, Google, registro
│   └── me-response.dto.ts          # saída de GET /auth/me
├── mappers/
│   ├── auth-user.mapper.ts         # usuário exposto em login e registro
│   └── me.mapper.ts                # a árvore usuário → perfil → equipe → abrigo
├── services/
│   ├── login.service.ts
│   ├── google-login.service.ts
│   ├── auth-token.service.ts       # emitir, renovar e encerrar
│   ├── register.service.ts         # cadastro e conclusão de cadastro
│   ├── get-me.service.ts
│   ├── auth-context.service.ts     # ator para rotas sem JwtAuthGuard
│   └── password-recovery.service.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── role-guard.ts               # AdminRoleGuard, AdminOrLeaderRoleGuard
├── strategies/jwt.strategy.ts
├── repositories/password-reset-token.repository.ts
├── entities/password-reset-token.entity.ts
└── utils/auth-token.util.ts        # extração do token, papel, expiresIn
```

---

## 🎫 Tokens

`AuthTokenService` é o dono do ciclo de vida. Os três caminhos de entrada
(senha, Google e renovação) emitem pelo mesmo lugar.

| Token | Segredo | Onde vive |
|-------|---------|-----------|
| `accessToken` | `JWT_SECRET` | só no cliente |
| `refreshToken` | `JWT_REFRESH_SECRET` | no cliente **e** em `users.refreshToken` |

A renovação compara o token recebido com o guardado: um refresh válido que não
seja o último emitido é recusado. É isso que invalida a sessão antiga depois de
um logout ou de outra renovação.

Cada refresh carrega um `jti` único. **Sem ele, duas emissões no mesmo segundo
saíam com a mesma string** — mesmas claims, mesmo `iat` — e a rotação não
invalidava nada.

### Onde o token é lido

`JwtStrategy` (usada pelo `JwtAuthGuard`) lê só o header `Authorization`, e
popula `request.user` como `AuthenticatedUser` — o campo é **`userId`**, não
`id`. `AuthContextService`, usado por rotas que respondem diferente para anônimo
e autenticado, aceita também cookie e query string (links que o navegador abre
sem passar pelo axios).

---

## 🚪 Login

| Situação | Resposta |
|----------|----------|
| credenciais válidas, conta ativa | `201` com usuário e o par de tokens |
| credenciais válidas, conta inativa | `201` com usuário e **sem tokens** |
| e-mail inexistente ou senha errada | `401 Invalid credentials` |

A conta inativa responde sucesso de propósito: a tela de login lê
`user.active === false` para pedir a validação, em vez de tratar um erro. E as
duas falhas usam a **mesma mensagem**, para não revelar quais e-mails existem.

### Google

`GoogleLoginService` classifica a falha da `google-auth-library` pela mensagem
(a biblioteca não expõe código tipado): expirado, inválido, ou a mensagem
genérica. Só a verificação da credencial fica dentro do `try` — antes o bloco
envolvia também a escrita no banco, e uma falha de banco era devolvida como
"Google authentication failed".

---

## 🛡️ Papéis

`AdminRoleGuard` e `AdminOrLeaderRoleGuard` derivam de uma base comum: eram duas
classes quase idênticas, cada uma com um `Reflector` e um `Logger` que nunca
foram usados. Rodam depois do `JwtAuthGuard` e respondem `403`.

---

## 🤝 Contratos com outros módulos

O auth não alcança repositório de ninguém. O que ele precisa, os módulos donos
expõem como serviço:

| Contrato | Módulo dono |
|----------|-------------|
| `GetUsersService.findByEmail` / `findByIdOrNull` / `findWithProfiles` | `core/user` |
| `UpdateUserService.setRefreshToken` / `update` | `core/user` |
| `CreateUserService.create` | `core/user` |
| `GetOneProfileService.execute` | `core/profile` |
| `MemberProfilesService.assignTeamForUser` | `shelter/member-profile` |

`AuthRepository` foi removido: era um encaminhamento puro para
`UserRepository.findByEmail`, com a assinatura `validateUser(email, password)`
que **ignorava a senha** — quem comparava o hash era o serviço.

`GET /auth/me` monta dados pessoais e preferências a partir do contrato do
módulo de perfil, que já devolve exatamente essa forma. Antes as duas normalizações
de data conviviam, uma em cada módulo.

---

## ❗ Erros

Todo erro sai como subclasse de `AppException`, com a categoria e o nome HTTP
que o `ERROR_HANDLING_GUIDE.md` documenta:

| Situação | Exceção | Status |
|----------|---------|--------|
| credencial ausente, inválida ou expirada | `UnauthenticatedException` | 401 |
| papel insuficiente | `AccessDeniedException` | 403 |
| e-mail sem conta | `ResourceNotFoundException` | 404 |
| e-mail já cadastrado, cadastro já concluído | `ResourceConflictException` | 409 |
| token de recuperação inválido | `RuleException` | 400 |

`UnauthenticatedException` e `ResourceConflictException` nasceram nesta leva e
ficam no catálogo compartilhado (`src/common/exceptions/`).

---

## 🧪 Testes

```bash
npx jest src/core/auth
```

18 suítes (173 testes) cobrindo controller, os serviços, mappers, guards, strategy,
os dois repositórios de token, utils e a validação dos DTOs. `collaborator-failure.spec.ts`
traz os casos `falha-do-colaborador-sem-efeito-parcial` da matriz.

Ao vivo (`orfanatonib-app/e2e/live/auth/`, contra a API e o MySQL reais, prova por `SELECT`, negativos com banco inalterado):
`auth.api.spec.ts`, `auth-matrix.api.spec.ts`, `auth-session.api.spec.ts` (login/refresh/logout/me/google por perfil),
`auth-account.api.spec.ts` (register/complete/verify/resend/forgot/validate/reset por perfil),
`auth-pages.ui.spec.ts` e `auth-flows.ui.spec.ts` (telas, flags e 375 px). Matriz: `node scripts/check-scenario-coverage.mjs --unit=auth` → 147/148;
falta só `auth.post.auth-google#feliz` (um ID token válido só o Google assina; o E2E não simula provedor).
Expiração de token: não é forjável por API (o banco do E2E é só leitura); coberta em `*-token.repository.spec.ts`.

---

## 📌 Débitos conhecidos

- `core/user` e `core/profile` ainda não passaram pelo padrão; os contratos que
  o auth usa foram adicionados, mas os módulos em si seguem na fila.

## Feature flags e erros (plano 06/08)
| Endpoint | Flag | Desligada |
|---|---|---|
| `POST /auth/google` | `google_login` | `403` `details.code = FEATURE_DISABLED` |
| `POST /auth/register`, `POST /auth/complete-register` | `public_registration` | idem |
| `POST /auth/forgot-password`, `GET /auth/reset-password/validate`, `POST /auth/reset-password` | `password_recovery` | idem |

Com a flag desligada **nada é gravado** (E2E confere `users`/`password_reset_tokens` inalterados). Sessão ausente, token malformado, assinatura adulterada e `alg=none` ⇒ `401`. Login com e-mail inexistente e com senha errada devolvem a **mesma mensagem** (não revela se o e-mail existe).

## Quem chama `/auth/refresh` e `/auth/complete-register` (decisão 2026-11-21)
Os dois **têm chamador** no front (o inventário automático não os achava porque o endpoint sai de uma variável ou de um interceptor):

| Endpoint | Chamador | Evidência |
|---|---|---|
| `POST /auth/refresh` | interceptor de resposta 401 do Axios (renovação única compartilhada por `refreshPromise`) | `orfanatonib-app/src/config/axiosConfig.ts:71-91` |
| `POST /auth/complete-register` | rota `/cadastrar-google` → `Register commonUser={false}` → `apiCompleteRegister(…)`, depois do login Google devolver `newUser` + `completionToken` | `src/routes/publicRoutes.tsx:47-53`, `src/features/auth/api.ts` (`apiCompleteRegister`), `src/pages/Login/Login.tsx:169-174` |

Ficam. Cobertura: `auth-session.api.spec.ts` (refresh: rotação, reuso, perfis, escopo) e `auth-account.api.spec.ts` (complete-register).

### Segurança fechada em 2026-11-21 (plano 06, achados 1 a 3)

**Ninguém vira admin pela API.** `RegisterUserDto.role` e `CompleteUserDto.role` aceitam só `member|leader` (`GRANTABLE_ROLES` em `auth.types.ts`; `admin` ou qualquer outro valor => 400 e nada é criado). `CreateUserService` recusa `role: admin` e `UpdateUserService` recusa PROMOVER a admin (400 `ADMIN_GRANT_FORBIDDEN`), mesmo vindo de um admin autenticado (`POST/PUT /users`). Um admin existente continua editável (mesmo papel, outros campos) e pode ser rebaixado; voltar a admin exige o banco.

**Como promover alguém a admin (direto no banco).** Confira o e-mail antes e rode só no ambiente certo; em staging/produção faça com backup/snapshot e por quem tem acesso ao banco:

```sql
-- 1) confira quem será promovido
SELECT id, email, role, active FROM users WHERE email = 'pessoa@exemplo.org';
-- 2) promova (NUNCA rode sem o WHERE e sem conferir o passo 1)
UPDATE users SET role = 'admin' WHERE email = 'pessoa@exemplo.org';
```

Quem já tinha perfil de líder/membro pode ficar com o perfil antigo; remova-o pela tela de usuários antes de promover. A pessoa precisa entrar de novo para o JWT trazer o papel novo. O admin local (`e2e.admin@orfanatonib.test`) é criado/promovido direto no banco por `scripts/seed-local-credentials.js` (bcrypt, idempotente).

**`complete-register` exige prova de posse da identidade Google.** `POST /auth/google`, para conta nova ou pendente (`completed=false`), devolve `completionToken`: JWT com `{sub: id do usuário, purpose: "complete_register", jti}`, validade 15 min (`COMPLETION_TOKEN_TTL_MINUTES`), assinado com uma chave derivada de `JWT_SECRET` (HMAC-SHA256 com o propósito) — por isso nunca vale como JWT de sessão, nem o contrário. `complete-register` não aceita mais `email` (400): a conta vem do token. Uso único sem tabela nova: a conclusão grava `completed=true` e a rota recusa qualquer token de conta já completa (reuso, conta ativa e conta inexistente dão o mesmo 401 `Sessão de cadastro inválida ou expirada...`). Sem migration (reaproveita a coluna `completed`). Front: o token fica só no estado Redux em memória (`googleUser.completionToken`, fora do `whitelist` do persist), nunca em `localStorage`; recarregar a página exige entrar com o Google de novo.

**Enumeração de e-mails.** `forgot-password` responde sempre `201` com o mesmo corpo genérico e não espera o banco nem o envio: a busca, o token e o e-mail rodam em segundo plano (`deliverResetLink`, nunca lança), só para conta existente e completa. `complete-register` com token inválido não diferencia inexistente de não pendente. Auditoria do módulo: `resend-verification` já respondia igual (conferido); `login` responde a mesma mensagem para e-mail inexistente e senha errada; `reset-password/validate` e `reset-password` só revelam o e-mail a quem tem o token. `register` com e-mail já cadastrado responde `409` — inerente a qualquer cadastro com e-mail único; aceito e documentado (mitigação: rate limit, decisão abaixo). `POST /auth/google` devolve `newUser:false` para conta existente, mas só a quem apresenta um ID token válido do próprio Google.

### Decisões ainda abertas do solicitante
- **Tokens em `localStorage`/redux-persist** (T3.1); rate limit removido por decisão do solicitante (T3.2; reavaliar no futuro).

## Falha parcial (2026-11-21)
`POST /auth/verify-email` confirma o e-mail **antes** de gastar o token (sem transação; se a confirmação falhar o link continua válido). `POST /auth/reset-password` não falha mais se só o aviso "senha alterada" não puder ser enfileirado (a senha já mudou e o token já foi apagado).

## Segredo do JWT
`JWT_SECRET` é lido num único ponto (`readJwtSecret` → `getOrThrow`) e é obrigatório no boot (`validateEnv`).

## Front (páginas públicas)
HTTP em `features/auth/api.ts` (as páginas não usam Axios direto); aterrissagem única em `features/auth/landing.ts` (admin e líder → `/adm`, membro → `/area-do-membro`); a página de redefinição de senha tira o token da URL e envia `no-referrer` (`resetTokenPrivacy`).
