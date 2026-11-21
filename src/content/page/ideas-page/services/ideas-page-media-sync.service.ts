import { Injectable } from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
import { IdeasPageTransaction } from "../repositories/ideas-page-write.repository";
import {
  IdeasMediaInput,
  linkFields,
  normalizeMediaType,
  planMedia,
} from "../utils/ideas-page-media.utils";

export interface SectionMediaResult {
  saved: MediaItemEntity[];
  /** URLs de arquivos que deixam de ser referenciados; apagar só DEPOIS do commit. */
  obsoleteUrls: string[];
}

@Injectable()
export class IdeasPageMediaSyncService {
  constructor(
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /**
   * Ordem segura: novos arquivos sobem no `batch` → linhas gravadas na transação
   * → antigos só são apagados após o commit (quem chama usa `obsoleteUrls`).
   */
  async syncSection(
    tx: IdeasPageTransaction,
    sectionId: string,
    inputs: IdeasMediaInput[],
    oldMedia: MediaItemEntity[],
    filesDict: Record<string, Express.Multer.File>,
    batch: UploadBatch,
  ): Promise<SectionMediaResult> {
    const saved: MediaItemEntity[] = [];
    const obsoleteUrls: string[] = [];

    for (const input of inputs) {
      const existing = input.id
        ? oldMedia.find((m) => m.id === input.id)
        : undefined;
      const plan = planMedia(input, existing, filesDict);
      const base = this.mediaProcessor.buildBaseMediaItem(
        { ...input, mediaType: normalizeMediaType(input.mediaType) },
        sectionId,
        MediaTargetType.IdeasSection,
      );

      switch (plan.kind) {
        case "new-link":
          base.url = input.url?.trim() ?? "";
          base.isLocalFile = false;
          saved.push(await tx.saveMedia(base));
          break;
        case "new-file":
        case "replace-file": {
          await this.attachUpload(base, plan.file, sectionId, batch);
          if (plan.kind === "replace-file") {
            if (plan.existing.isLocalFile && plan.existing.url) {
              obsoleteUrls.push(plan.existing.url);
            }
            saved.push(await tx.saveMedia({ ...base, id: plan.existing.id }));
          } else {
            saved.push(await tx.saveMedia(base));
          }
          break;
        }
        case "keep-file":
          Object.assign(base, {
            uploadType: UploadType.UPLOAD,
            url: plan.existing.url,
            originalName: plan.existing.originalName,
            isLocalFile: plan.existing.isLocalFile,
            size: plan.existing.size,
            storageKey: plan.existing.storageKey,
          });
          saved.push(await tx.saveMedia({ ...base, id: plan.existing.id }));
          break;
        case "link":
          if (plan.existing.isLocalFile && plan.existing.url) {
            obsoleteUrls.push(plan.existing.url);
          }
          saved.push(
            await tx.saveMedia({
              ...base,
              ...linkFields(input, plan.existing),
              storageKey: null,
              id: plan.existing.id,
            }),
          );
          break;
      }
    }
    return { saved, obsoleteUrls };
  }

  private async attachUpload(
    media: MediaItemEntity,
    file: Express.Multer.File,
    sectionId: string,
    batch: UploadBatch,
  ): Promise<void> {
    await this.mediaStorage.uploadAll(
      [
        {
          file,
          mediaType: media.mediaType,
          entity: MediaTargetType.IdeasSection,
          ownerId: sectionId,
        },
      ],
      batch,
    );
    const uploaded = batch.objects[batch.objects.length - 1];
    media.url = uploaded.url;
    media.storageKey = uploaded.key;
    media.uploadType = UploadType.UPLOAD;
    media.isLocalFile = true;
    media.originalName = file.originalname;
    media.size = file.size;
    media.platformType = undefined;
  }
}
