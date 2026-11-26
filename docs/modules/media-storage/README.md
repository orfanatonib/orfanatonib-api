# Armazenamento de mídia (S3)

![Fluxo](../../diagrams/flow/media-storage/media-storage-flow.png)

## Peças
- `MediaStorageService` (`src/shared/media/storage`): `uploadAll` (valida MIME, **assinatura dos bytes** e tamanho por `MediaType`; chave `<env>/<entidade>/<ownerId>/<uuid>.<ext>`), `UploadBatch.discard()` (apaga o que subiu se algo falhar), `deleteAfterCommit(urls)` (remoção depois do commit; falha vai para `media_cleanup_queue`), `deleteStrict(url)`.
- `AwsS3Service.upload`/`delete` (**caminho legado**, ainda usado por ~35 arquivos): chave `<env>/uploads/<uuid>_<nome saneado>`; dentro de uma requisição HTTP o `UploadScopeInterceptor` **adia** as exclusões até o sucesso e descarta os uploads novos se a requisição falhar; exclusão imediata que falha vai para a fila de limpeza.
- `media_cleanup_queue`: reprocessada a cada 10 min (`MediaCleanupService`); após 5 tentativas recebe `failedAt`.
- `MediaReconciliationService`: compara o bucket com **todas** as colunas de mídia (`media_items` + `MEDIA_URL_REFERENCE_COLUMNS` / `MEDIA_KEY_REFERENCE_COLUMNS`: imagem de rota, capas e arquivos do Estúdio), o mesmo inventário que `MediaReferenceRepository` usa antes de descartar um upload; coluna de mídia nova tem de entrar na lista (o teste de arquitetura falha). Órfão com mais de 24 h só é removido com `dryRun: false`; referência sem objeto é apenas reportada. O agendamento diário (3h) roda só em dry-run; `POST /media-storage/reconcile` (admin) para execução manual.
- `media_items.storageKey` (nullable): registros antigos continuam resolvendo a chave pela URL.

## Política de upload
- Todo `FileInterceptor`/`FilesInterceptor` tem `limits` (`upload-limits.constants.ts`); nenhum handler sem limite.
- MIME aceito por tipo (`media-storage.constants.ts`); **o conteúdo precisa bater com o MIME declarado** (PNG, JPEG, GIF, WebP, PDF) — HTML renomeado para `.png` é recusado com `MEDIA_CONTENT`.
- URL fora do nosso bucket nunca é lida nem apagada (`keyFromOwnedUrl`); URL sem chave extraível em `delete` é registrada como **erro**.

## Decisão (plano 05): `UploadScopeInterceptor` é o padrão de segurança; `MediaStorageService` é o padrão de código novo
- **`UploadScopeInterceptor`** (`APP_INTERCEPTOR` global, `MediaModule`) é o **padrão oficial** do ciclo seguro por requisição HTTP: toda exclusão feita por `AwsS3Service.delete` é **adiada** até a requisição terminar com sucesso (e só se ninguém mais referencia o arquivo); se a requisição falha, as exclusões são descartadas (o objeto antigo continua referenciado) e os uploads sem referência são removidos. Falha de remoção vai para `media_cleanup_queue`. Vale para **qualquer** rota, inclusive as ainda não migradas.
- **`MediaStorageService`** (`uploadAll` + `UploadBatch.discard()` + `deleteAfterCommit`) é o padrão para **código novo**: política por tipo, chave por entidade/dono e ordem explícita upload → transação → commit → remoção. A trava `legacy-s3-usage.architecture.spec.ts` impede que uma feature nova importe o `AwsS3Service`; a lista de legado só encolhe.
- Migração **incremental e só onde o contrato é preservado**. Já migradas por completo: integração, atendente, evento, foto de usuário (upload), abrigo, documento (controller), páginas de imagem/vídeo/ideias, publicações de imagem e Estúdio. Migradas na **remoção** (exclusão explícita pós-commit via `deleteAfterCommit`, upload ainda no serviço legado): atualização de documento, atualização/exclusão de meditação e exclusão de usuário. O resto está listado no plano 05 (§Fechamento 2026-11-21) com o motivo.

## Garantias testadas
- `legacy-s3-usage.architecture.spec.ts` (o legado não cresce), `upload-limits.architecture.spec.ts` (todo handler tem `limits`), `visit-material-media.rollback.spec.ts` (AwsS3Service real + escopo real + bucket em memória), `update-meditation.service.spec.ts`, `aws-s3.service.spec.ts` (chave, colisão, MIME×bytes, adiamento, fila, SSRF), `upload-scope.interceptor.spec.ts`, `media-item-processor.spec.ts`, `media-storage.service.spec.ts`, `media-cascade.architecture.spec.ts` (**todo `delete-*.service` trata a mídia ou está na lista de donos sem mídia**).
- E2E: `e2e/live/security/media-entities`, `media-lifecycle` e `zz-final/bucket-invariants` (sem órfão nem referência quebrada).

## Front
Validação de tipo/tamanho **antes do envio** em `src/utils/mediaUpload` (espelho da política da API; a API continua sendo a autoridade) e progresso real de envio (`onUploadProgress`) na foto de perfil. E2E de UI full-stack: `e2e/live/media-upload/media-upload.ui.spec.ts` (inclui 375 px) e `media-upload.s3.api.spec.ts` (12 cenários do §7.4 no caminho legado).

## Postman
`Media_Storage_API_Collection.postman_collection.json` (reconciliação, só admin).
