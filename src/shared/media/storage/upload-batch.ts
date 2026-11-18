import { Logger } from "@nestjs/common";

import type { UploadedObject } from "./media-storage.types";

/** Objetos enviados numa operação; `discard()` desfaz o que subiu se algo falhar depois. */
export class UploadBatch {
  private readonly logger = new Logger(UploadBatch.name);
  private readonly uploaded: UploadedObject[] = [];

  constructor(
    private readonly removeKey: (key: string) => Promise<void>,
    private readonly onRemoveFailure: (
      key: string,
      error: string,
    ) => Promise<void>,
  ) {}

  add(object: UploadedObject): void {
    this.uploaded.push(object);
  }

  get objects(): readonly UploadedObject[] {
    return this.uploaded;
  }

  /** Apaga o que subiu; falha de remoção vai para a fila de limpeza (nunca é engolida). */
  async discard(): Promise<void> {
    const items = this.uploaded.splice(0);
    for (const { key } of items) {
      try {
        await this.removeKey(key);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao descartar ${key}: ${message}`);
        await this.onRemoveFailure(key, message);
      }
    }
  }

  /** Após o commit: o que subiu passa a ser referenciado e não deve mais ser descartado. */
  commit(): void {
    this.uploaded.length = 0;
  }
}
