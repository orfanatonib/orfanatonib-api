import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Escopo de uma requisição HTTP para o armazenamento legado (`AwsS3Service.upload/delete`):
 * - uploads feitos durante a requisição são lembrados;
 * - exclusões são ADIADAS até a requisição terminar com sucesso.
 * Se a requisição falha, as exclusões são descartadas (o objeto antigo continua
 * referenciado) e só os uploads que ninguém referencia são removidos.
 */
export class UploadScope {
  readonly uploadedUrls: string[] = [];
  readonly deferredDeletes: string[] = [];

  recordUpload(url: string): void {
    this.uploadedUrls.push(url);
  }

  deferDelete(url: string): void {
    if (!this.deferredDeletes.includes(url)) this.deferredDeletes.push(url);
  }
}

export const uploadScopeStorage = new AsyncLocalStorage<UploadScope>();

export const currentUploadScope = (): UploadScope | undefined =>
  uploadScopeStorage.getStore();
