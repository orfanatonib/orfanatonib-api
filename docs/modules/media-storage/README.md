# Armazenamento de mídia (S3)

- `MediaStorageService` (`src/shared/media/storage`): `uploadAll` (valida MIME/tamanho por `MediaType`, chave `<env>/<entidade>/<ownerId>/<uuid>.<ext>`), `UploadBatch.discard()` (apaga o que subiu se algo falhar), `deleteAfterCommit(urls)` (remoção depois do commit; falha vai para `media_cleanup_queue`), `deleteStrict(url)`.
- `media_cleanup_queue`: reprocessada a cada 10 min (`MediaCleanupService`); após 5 tentativas recebe `failedAt`.
- `MediaReconciliationService`: compara bucket × `media_items`; órfão com mais de 24 h só é removido com `dryRun: false`; referência sem objeto é apenas reportada. O agendamento diário roda só em dry-run.
- `media_items.storageKey` (nullable): registros antigos continuam resolvendo a chave pela URL.
- `AwsS3Service.upload`/`delete` (legado) seguem existindo para os serviços ainda não migrados; `upload` agora usa UUID na chave (sem colisão por `Date.now`).
- Migração dos serviços de create/update/delete para `MediaStorageService` acontece junto de cada feature dona (planos 07, 13, 20, 25–35, 40).
