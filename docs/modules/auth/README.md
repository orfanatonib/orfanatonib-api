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

15 suítes cobrindo controller, os sete serviços, mappers, guards, strategy,
repositório, utils e a validação dos DTOs. Cobertura acima de 95% em statements
e linhas, 100% em branches.

Ao vivo: `orfanatonib-app/e2e/live/auth.api.spec.ts` (14 cenários contra a API e
o MySQL reais), incluindo a rotação e a invalidação do refresh.

---

## 📌 Débitos conhecidos

- **`POST /auth/forgot-password` revela quais e-mails existem**: um e-mail sem
  conta responde `400 "Email não encontrado na base de dados."`. Responder
  sempre sucesso fecharia a enumeração, mas tira o retorno de quem só errou de
  digitação — é decisão de produto, não de refatoração, e ficou como está.
- `core/user` e `core/profile` ainda não passaram pelo padrão; os contratos que
  o auth usa foram adicionados, mas os módulos em si seguem na fila.

## Feature flags e erros (plano 06/08)
| Endpoint | Flag | Desligada |
|---|---|---|
| `POST /auth/google` | `google_login` | `403` `details.code = FEATURE_DISABLED` |
| `POST /auth/register`, `POST /auth/complete-register` | `public_registration` | idem |
| `POST /auth/forgot-password`, `GET /auth/reset-password/validate`, `POST /auth/reset-password` | `password_recovery` | idem |

Com a flag desligada **nada é gravado** (E2E confere `users`/`password_reset_tokens` inalterados). Sessão ausente, token malformado, assinatura adulterada e `alg=none` ⇒ `401`. Login com e-mail inexistente e com senha errada devolvem a **mesma mensagem** (não revela se o e-mail existe).

## Segredo do JWT
`JWT_SECRET` é lido num único ponto (`readJwtSecret` → `getOrThrow`) e é obrigatório no boot (`validateEnv`).

## Front (páginas públicas)
HTTP em `features/auth/api.ts` (as páginas não usam Axios direto); aterrissagem única em `features/auth/landing.ts` (admin e líder → `/adm`, membro → `/area-do-membro`); a página de redefinição de senha tira o token da URL e envia `no-referrer` (`resetTokenPrivacy`).
