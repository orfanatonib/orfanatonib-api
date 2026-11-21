# Módulo Ideas Pages (Páginas de ideias)

Página de ideias é a galeria curada: título, descrição, **seções** (cada uma uma ideia) e, em cada
seção, mídias (imagem, vídeo, documento; arquivo no bucket ou link). Cada página tem uma rota
dinâmica (`routes`, tipo `IdeasPage`). As ideias enviadas por membros entram soltas e são anexadas
pelo módulo `ideas-sections` (`PATCH /ideas-sections/:id/attach/:pageId`).

## Estrutura

```
ideas-page/
├── constants/ideas-page.constants.ts    prefixo e imagem da rota
├── dto/                                 entrada (create/update) e resposta
├── entities/ideas-page.entity.ts
├── repositories/
│   ├── ideas-page.repository.ts         leituras
│   └── ideas-page-write.repository.ts   escritas numa transação (único ponto com EntityManager)
├── services/
│   ├── create-ideas-page.service.ts
│   ├── update-ideas-page.service.ts
│   ├── ideas-page-media-sync.service.ts mídia da atualização (sobe, grava, marca o que apagar)
│   ├── delete-ideas-page.service.ts
│   └── get-ideas-page.service.ts
├── utils/ideas-page-media.utils.ts      plano de cada item de mídia (puro, testado)
└── ideas-page.controller.ts
```

## Acesso e flags

**Decisão fechada (plano 31, auditoria 2026-11-20): a página de ideias é SEMPRE privada.** Não existe
página de ideias pública: a rota nasce e permanece `public = false`, a página nasce `public = false`
e nenhuma API altera isso.

| Rota | Quem | Flag |
|------|------|------|
| `POST /ideas-pages` | admin | `page_management` **e** `ideas_sharing` |
| `PATCH /ideas-pages/:id` | admin | `page_management` **e** `ideas_sharing` |
| `DELETE /ideas-pages/:id` | admin | `page_management` **e** `ideas_sharing` |
| `GET /ideas-pages` | qualquer perfil com sessão | `ideas_sharing` |
| `GET /ideas-pages/:id` | qualquer perfil com sessão | `ideas_sharing` |

- Visitante anônimo: **401** em tudo (o `JwtAuthGuard` roda antes da flag). Membro e líder: leitura
  conforme a flag (`ideas_sharing` liga `admin`, `leader` e `member`), escrita 403. Flag desligada:
  `403 FEATURE_DISABLED`, sem gravar.
- **`public` no corpo:** `POST`/`PATCH` **rejeitam** `public: true` com `400` (validação explícita
  `@Equals(false)`); ausente ou `false` equivalem e o valor nunca é persistido. O `public` das
  *seções* é outro conceito (módulo `ideas-sections`) e não muda.
- **Resposta:** `IdeasPageResponseDto` não traz mais `public` na página e `route.public` é sempre
  `false`.
- **Dados legados:** o código tolera linhas antigas com `ideas_pages.public = 1` / `routes.public = 1`
  (leitura ignora a coluna; `GET /routes` e `GET /routes/:id` nunca devolvem rota `IdeasPage` ao
  visitante; o próximo `PATCH` regrava `public = false`). **Pendência:** a normalização em massa
  dos dados existentes é um UPDATE puro, que `migration:generate` não gera (só gera diferença de
  esquema); por regra do projeto o SQL não foi inventado. Se quiser limpar o legado, uma migration
  de dados precisa ser autorizada.
- `ideas-page` saiu de `CORE_UNFLAGGED` (`feature-flags.architecture.spec.ts`): todos os handlers
  têm `@FeatureFlag`.

## Mídia e S3 (sem órfão, sem referência quebrada)

- Os arquivos passam por `MediaStorageService.uploadAll`: valida MIME, assinatura dos bytes e tamanho
  (imagem 10 MB, documento 25 MB, vídeo 200 MB) e grava com chave única
  `<env>/IdeasSection/<dono>/<uuid>.<ext>` (dois uploads de mesmo nome não colidem).
- **Criar:** envia todos os arquivos antes da transação; falha em qualquer ponto (validação do 2º
  arquivo, banco, rota) descarta o que subiu (`UploadBatch.discard`) e o banco faz rollback.
- **Atualizar:** a linha da página é travada (`FOR UPDATE`) — duas edições simultâneas se enfileiram.
  Novos arquivos sobem, linhas são gravadas na transação, e só **depois do commit** os arquivos
  substituídos/removidos são apagados (`deleteAfterCommit`; falha vai para `media_cleanup_queue`).
  Falha antes do commit: novos descartados, antigos intactos.
- **Apagar:** linhas (página, rota, seções, mídia) saem numa transação; objetos só depois do commit.
- Item com `id` de mídia que não pertence à página é tratado como item novo (nunca sobrescreve a
  mídia de outra página). Seção com `id` desconhecido vira seção nova.
- `GET` responde com `IdeasPageResponseDto`; `PATCH` agora devolve também as mídias salvas.

## Erros

Erros HTTP (400/404) chegam ao cliente com o status certo: `PATCH`/`DELETE` de id inexistente dão
**404** (antes viravam 400). Falha inesperada continua sendo 400 genérico, sem vazar a mensagem interna.

## Testes

- Jest: `services/*.spec.ts`, `repositories/ideas-page-write.repository.spec.ts`,
  `utils/ideas-page-media.utils.spec.ts`, `ideas-page.controller.spec.ts` (guards e flags),
  `get-ideas-page.visibility.spec.ts`.
- Playwright (app): `e2e/live/ideas-pages/` (autorização, matriz da API, S3 `.01`–`.12`, telas e mobile).
