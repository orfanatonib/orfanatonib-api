/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { UploadBatch } from "src/shared/media/storage/upload-batch";
import type { IdeasPageTransaction } from "../repositories/ideas-page-write.repository";

export const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export const file = (name = "a.png"): Express.Multer.File =>
  ({
    fieldname: name,
    originalname: name,
    mimetype: "image/png",
    size: PNG.length,
    buffer: PNG,
  }) as Express.Multer.File;

/** Armazenamento falso: registra envios e remoções; `failOnUpload` falha no N-ésimo envio. */
export function fakeStorage(options: { failOnUpload?: number } = {}) {
  const removed: string[] = [];
  const queued: string[] = [];
  let uploads = 0;
  const newBatch = () =>
    new UploadBatch(
      async (key) => {
        removed.push(key);
      },
      async (key) => {
        queued.push(key);
      },
    );
  const storage = {
    newBatch: jest.fn(newBatch),
    uploadAll: jest.fn(
      async (
        requests: Array<{ file: Express.Multer.File }>,
        batch: UploadBatch,
      ) => {
        for (const req of requests) {
          uploads += 1;
          if (options.failOnUpload === uploads) {
            await batch.discard();
            throw new Error("arquivo recusado");
          }
          batch.add({
            key: `k/${req.file.originalname}-${uploads}`,
            url: `https://bucket/k/${req.file.originalname}-${uploads}`,
          });
        }
        return batch;
      },
    ),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
  return { storage, removed, queued };
}

export const mediaProcessor = () => new MediaItemProcessor({} as never);

/** Transação falsa: `transaction` roda o trabalho; o que lançar propaga (rollback). */
export function fakeWriteRepo(
  tx: Partial<Record<keyof IdeasPageTransaction, unknown>>,
) {
  return {
    transaction: jest.fn(
      async <T>(work: (t: IdeasPageTransaction) => Promise<T>) =>
        work({ manager: {}, ...tx } as unknown as IdeasPageTransaction),
    ),
  };
}
