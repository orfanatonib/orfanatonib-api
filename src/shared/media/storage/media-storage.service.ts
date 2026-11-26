import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaType } from "../media-item/media-item.entity";
import { MediaCleanupQueueRepository } from "./media-cleanup-queue.repository";
import {
  extractStorageKey,
  buildStorageKey,
  validateUploadedFile,
} from "./media-storage.utils";
import { UploadBatch } from "./upload-batch";

export interface UploadRequest {
  file: Express.Multer.File;
  mediaType: MediaType;
  entity: string;
  ownerId: string;
  /** Documento sensível: vai para `<env>/private/...` e só se lê por URL assinada. */
  private?: boolean;
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);

  constructor(
    private readonly s3: AwsS3Service,
    private readonly cleanupQueue: MediaCleanupQueueRepository,
  ) {}

  newBatch(): UploadBatch {
    return new UploadBatch(
      (key) => this.s3.deleteKey(key),
      (key, error) => this.cleanupQueue.enqueue(key, error),
    );
  }

  /** Valida (MIME/tamanho) e envia todos; se um falhar, descarta os já enviados. */
  async uploadAll(
    requests: UploadRequest[],
    batch = this.newBatch(),
  ): Promise<UploadBatch> {
    for (const req of requests) {
      const check = validateUploadedFile(req.file, req.mediaType);
      if (!check.ok) {
        await batch.discard();
        throw new BadRequestException({
          message: `Arquivo "${req.file.originalname}" recusado (${check.reason}).`,
          category: "RULE",
          details: { code: `MEDIA_${check.reason.toUpperCase()}` },
        });
      }
      const key = buildStorageKey({
        environment: this.s3.getEnvironment(),
        entity: req.entity,
        ownerId: req.ownerId,
        extension: check.extension,
        private: req.private,
      });
      try {
        const url = await this.s3.putObject(
          key,
          req.file.buffer,
          check.contentType,
        );
        batch.add({ key, url });
      } catch (err) {
        await batch.discard();
        throw err;
      }
    }
    return batch;
  }

  /** Para chamar DEPOIS do commit: falha não desfaz a operação, vai para a fila. */
  async deleteAfterCommit(urls: string[]): Promise<void> {
    for (const url of urls) {
      const key = extractStorageKey(url, this.s3.getBucketName());
      if (!key) {
        await this.cleanupQueue.enqueue(
          url.slice(0, 512),
          "chave não extraível da URL",
        );
        continue;
      }
      try {
        await this.s3.deleteKey(key);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao remover ${key}: ${message}`);
        await this.cleanupQueue.enqueue(key, message);
      }
    }
  }

  /** Remoção que propaga o erro (uso explícito quando o chamador precisa saber). */
  async deleteStrict(url: string): Promise<void> {
    const key = extractStorageKey(url, this.s3.getBucketName());
    if (!key) throw new Error(`Chave S3 não extraível: ${url}`);
    await this.s3.deleteKey(key);
  }
}
