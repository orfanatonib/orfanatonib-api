import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaCleanupQueueRepository } from "./media-cleanup-queue.repository";
import { MediaReferenceRepository } from "./media-reference.repository";
import { extractStorageKey } from "./media-storage.utils";
import { UploadScope, uploadScopeStorage } from "./upload-scope";

/**
 * Dá a TODA rota HTTP o ciclo seguro de mídia sem mexer em cada serviço:
 * exclusões só acontecem depois do sucesso; na falha, uploads sem referência são removidos.
 */
@Injectable()
export class UploadScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UploadScopeInterceptor.name);

  constructor(
    private readonly s3: AwsS3Service,
    private readonly references: MediaReferenceRepository,
    private readonly cleanupQueue: MediaCleanupQueueRepository,
  ) {
    // Exclusão imediata (fora de requisição) que falha vai para a fila, não some.
    this.s3.setDeleteFailureHandler((key, error) =>
      this.cleanupQueue.enqueue(key, error),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const scope = new UploadScope();

    return new Observable((subscriber) => {
      uploadScopeStorage.run(scope, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => {
            void this.onFailure(scope).finally(() => subscriber.error(error));
          },
          complete: () => {
            void this.onSuccess(scope).finally(() => subscriber.complete());
          },
        });
      });
    });
  }

  private async onSuccess(scope: UploadScope): Promise<void> {
    for (const url of scope.deferredDeletes) {
      try {
        if (await this.references.isReferenced(url)) continue;
        await this.removeObject(url);
      } catch (error: unknown) {
        this.logger.warn(`Exclusão adiada falhou: ${String(error)}`);
      }
    }
  }

  private async onFailure(scope: UploadScope): Promise<void> {
    for (const url of scope.uploadedUrls) {
      try {
        if (await this.references.isReferenced(url)) continue;
        await this.removeObject(url);
      } catch (error: unknown) {
        this.logger.warn(`Compensação de upload falhou: ${String(error)}`);
      }
    }
  }

  private async removeObject(url: string): Promise<void> {
    const key = extractStorageKey(url, this.s3.getBucketName());
    if (!key) {
      await this.cleanupQueue.enqueue(
        url.slice(0, 512),
        "chave não extraível da URL",
      );
      return;
    }
    try {
      await this.s3.deleteKey(key);
    } catch (error: unknown) {
      await this.cleanupQueue.enqueue(
        key,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
