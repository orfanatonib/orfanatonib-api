import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ExecutionContext } from "@nestjs/common";
import { lastValueFrom, from, Observable } from "rxjs";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { UploadScopeInterceptor } from "../storage/upload-scope.interceptor";

const BUCKET = "test-bucket";
const ENDPOINT = "http://s3.test";

/** Bytes de um PNG válido (assinatura conferida pela política de upload). */
export const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=",
  "base64",
);

export const pngFile = (name = "a.png"): Express.Multer.File =>
  ({
    fieldname: "file",
    originalname: name,
    mimetype: "image/png",
    size: PNG_BYTES.length,
    buffer: PNG_BYTES,
  }) as Express.Multer.File;

export interface InMemoryBucket {
  /** `AwsS3Service` REAL (validação de MIME, chave, escopo), falando com um bucket em memória. */
  s3: AwsS3Service;
  /** Chaves hoje no "bucket". */
  keys: () => string[];
  /** URL de um objeto que já estava lá (como se um upload anterior tivesse gravado). */
  plant: (key: string) => string;
  /**
   * Executa `work` como uma requisição HTTP, dentro do `UploadScopeInterceptor` REAL:
   * `isReferenced` decide o que o "banco" ainda referencia.
   */
  request: <T>(
    work: () => Promise<T>,
    isReferenced: (url: string) => boolean,
  ) => Promise<T>;
  restore: () => void;
}

/** Bucket em memória sobre o `AwsS3Service` real: prova rollback sem LocalStack. */
export function createInMemoryBucket(): InMemoryBucket {
  const objects = new Set<string>();
  const sendSpy = jest
    .spyOn(S3Client.prototype, "send")
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- `send` devolve Promise; o dublê também
    .mockImplementation((command: unknown) => {
      if (command instanceof PutObjectCommand) {
        objects.add(command.input.Key as string);
      } else if (command instanceof DeleteObjectCommand) {
        objects.delete(command.input.Key as string);
      }
      return Promise.resolve({});
    });
  const config = {
    get: (key: string) =>
      ({
        AWS_S3_BUCKET_NAME: BUCKET,
        AWS_ENDPOINT: ENDPOINT,
        ENVIRONMENT: "test",
      })[key],
  } as unknown as ConfigService;
  const s3 = new AwsS3Service(config);

  return {
    s3,
    keys: () => [...objects].sort(),
    plant: (key) => {
      objects.add(key);
      return `${ENDPOINT}/${BUCKET}/${key}`;
    },
    request: async <T>(
      work: () => Promise<T>,
      isReferenced: (url: string) => boolean,
    ) => {
      const interceptor = new UploadScopeInterceptor(
        s3,
        {
          isReferenced: (url: string) => Promise.resolve(isReferenced(url)),
        } as never,
        { enqueue: () => Promise.resolve() } as never,
      );
      const context = { getType: () => "http" } as unknown as ExecutionContext;
      const handler = { handle: (): Observable<T> => from(work()) };
      return lastValueFrom(
        interceptor.intercept(context, handler),
      ) as Promise<T>;
    },
    restore: () => sendSpy.mockRestore(),
  };
}
