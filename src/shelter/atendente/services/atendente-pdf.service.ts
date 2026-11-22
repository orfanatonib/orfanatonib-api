import { Injectable } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";

/** O que a escrita inteira compartilha: a transação, o lote de uploads descartável e os arquivos a apagar depois do commit. */
export interface PdfWriteUnit {
  manager: EntityManager;
  batch: UploadBatch;
  obsoleteUrls: string[];
}

export interface PdfInput {
  file: Express.Multer.File;
  title?: string;
  description?: string;
}

@Injectable()
export class AtendentePdfService {
  constructor(
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /**
   * Sobe o PDF (objeto PRIVADO: antecedente é dado sensível, lido só por URL assinada) para o lote e grava a linha na
   * transação. O PDF que ele substitui, se houver, perde a linha na mesma transação e o objeto sai só depois do commit.
   */
  async store(
    atendenteId: string,
    targetType: MediaTargetType,
    input: PdfInput,
    unit: PdfWriteUnit,
    replaces?: MediaItemEntity | null,
  ): Promise<MediaItemEntity> {
    await this.mediaStorage.uploadAll(
      [
        {
          file: input.file,
          mediaType: MediaType.DOCUMENT,
          entity: targetType,
          ownerId: atendenteId,
          private: true,
        },
      ],
      unit.batch,
    );
    const uploaded = unit.batch.objects[unit.batch.objects.length - 1];
    const media = this.mediaProcessor.buildBaseMediaItem(
      {
        title: input.title || input.file.originalname,
        description: input.description || "",
        mediaType: MediaType.DOCUMENT,
        uploadType: UploadType.UPLOAD,
        url: uploaded.url,
        isLocalFile: true,
        originalName: input.file.originalname,
        size: input.file.size,
      },
      atendenteId,
      targetType,
    );
    media.storageKey = uploaded.key;
    const saved = await this.mediaProcessor.saveMediaItem(media, unit.manager);
    if (replaces) await this.discard([replaces], unit);
    return saved;
  }

  /** Remove as linhas na transação; os objetos entram na lista para sair do bucket só depois do commit. */
  async discard(
    items: MediaItemEntity[],
    unit: Pick<PdfWriteUnit, "manager" | "obsoleteUrls">,
  ): Promise<void> {
    unit.obsoleteUrls.push(
      ...(await this.mediaProcessor.removeMediaItemsKeepingFiles(
        items,
        unit.manager,
      )),
    );
  }

  /** Fecha a escrita que deu certo: confirma o lote e apaga os objetos substituídos. */
  async finish(
    unit: Pick<PdfWriteUnit, "batch" | "obsoleteUrls">,
  ): Promise<void> {
    unit.batch.commit();
    await this.mediaStorage.deleteAfterCommit(unit.obsoleteUrls);
  }

  newBatch(): UploadBatch {
    return this.mediaStorage.newBatch();
  }
}
