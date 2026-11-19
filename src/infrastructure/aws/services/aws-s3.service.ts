import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { MediaType } from "src/shared/media/media-item/media-item.entity";
import { currentUploadScope } from "src/shared/media/storage/upload-scope";
import { validateUploadedFile } from "src/shared/media/storage/media-storage.utils";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly environment: string;
  private readonly endpoint?: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>("AWS_REGION") || "us-east-1";

    const accessKeyId =
      this.configService.get<string>("AWS_ACCESS_KEY_ID") ?? "test";
    const secretAccessKey =
      this.configService.get<string>("AWS_SECRET_ACCESS_KEY") ?? "test";
    this.environment = this.configService.get<string>("ENVIRONMENT") ?? "local";

    this.bucketName =
      this.configService.get<string>("AWS_S3_BUCKET_NAME") ||
      "orfanatos-nib-storage";
    this.endpoint =
      this.configService.get<string>("AWS_ENDPOINT") ||
      this.configService.get<string>("AWS_S3_ENDPOINT");

    if (!this.bucketName) {
      this.logger.error("AWS_S3_BUCKET_NAME not defined");
    }

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint || undefined,
      forcePathStyle: !!this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private deleteFailureHandler:
    | ((key: string, error: string) => Promise<void>)
    | null = null;

  /** Registrado pelo módulo de mídia: exclusão imediata que falha vai para a fila de limpeza. */
  setDeleteFailureHandler(
    handler: (key: string, error: string) => Promise<void>,
  ): void {
    this.deleteFailureHandler = handler;
  }

  private mediaTypeOf(mimetype: string): MediaType {
    if (mimetype.startsWith("image/")) return MediaType.IMAGE;
    if (mimetype.startsWith("video/")) return MediaType.VIDEO;
    if (mimetype.startsWith("audio/")) return MediaType.AUDIO;
    return MediaType.DOCUMENT;
  }

  async upload(file: Express.Multer.File): Promise<string> {
    // Política única de MIME/tamanho (antes qualquer `mimetype` do cliente ia direto ao bucket).
    const check = validateUploadedFile(file, this.mediaTypeOf(file.mimetype));
    if (!check.ok) {
      throw new BadRequestException({
        message: `Arquivo "${file.originalname}" recusado (${check.reason}).`,
        category: "RULE",
        details: { code: `MEDIA_${check.reason.toUpperCase()}` },
      });
    }
    const sanitizedFilename = file.originalname.replace(
      /[^a-zA-Z0-9.\-_]/g,
      "_",
    );

    const key = `${this.environment}/uploads/${randomUUID()}_${sanitizedFilename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      const url = this.endpoint
        ? `${this.endpoint}/${this.bucketName}/${key}`
        : `https://${this.bucketName}.s3.amazonaws.com/${key}`;
      currentUploadScope()?.recordUpload(url);
      return url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error uploading to S3: ${message}`);
      throw new Error("Error uploading to S3");
    }
  }

  async delete(url: string): Promise<void> {
    // Dentro de uma requisição HTTP a exclusão só ocorre depois do sucesso (UploadScopeInterceptor).
    const scope = currentUploadScope();
    if (scope) {
      scope.deferDelete(url);
      return;
    }
    let key = url.split(`${this.bucketName}.s3.amazonaws.com/`)[1];
    if (!key && url.includes(`/${this.bucketName}/`)) {
      key = url.split(`/${this.bucketName}/`)[1];
    }

    if (!key) {
      // Erro (não aviso): a mídia some do banco mas o objeto fica sem dono nem como limpar.
      this.logger.error(`Could not extract S3 key from URL: ${url}`);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error deleting from S3: ${message}`);
      await this.deleteFailureHandler?.(key, message);
    }
  }

  /** Chave do objeto quando a URL aponta para o NOSSO bucket; `null` para qualquer outra origem. */
  keyFromOwnedUrl(url: string): string | null {
    const virtualHosted = url.split(`${this.bucketName}.s3.amazonaws.com/`)[1];
    const pathStyle = url.includes(`/${this.bucketName}/`)
      ? url.split(`/${this.bucketName}/`)[1]
      : undefined;
    const key = virtualHosted ?? pathStyle;
    return key ? decodeURIComponent(key.split("?")[0]) : null;
  }

  /**
   * Lê um objeto do NOSSO bucket pelo SDK (funciona com bucket privado e sem DNS).
   * Recusa URL de outra origem (SSRF) e objeto maior que `maxBytes`, sem baixá-lo inteiro.
   */
  async downloadOwned(url: string, maxBytes: number): Promise<Buffer> {
    const key = this.keyFromOwnedUrl(url);
    if (!key) {
      throw new BadRequestException(
        "A URL não pertence ao bucket da aplicação.",
      );
    }
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (
      typeof response.ContentLength === "number" &&
      response.ContentLength > maxBytes
    ) {
      throw new BadRequestException(
        `O objeto excede o limite de ${maxBytes} bytes.`,
      );
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.Body as Readable) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maxBytes) {
        throw new BadRequestException(
          `O objeto excede o limite de ${maxBytes} bytes.`,
        );
      }
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }

  getEnvironment(): string {
    return this.environment;
  }

  getBucketName(): string {
    return this.bucketName;
  }

  buildUrl(key: string): string {
    return this.endpoint
      ? `${this.endpoint}/${this.bucketName}/${key}`
      : `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  /** Envia com chave e ContentType já validados pelo chamador. */
  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error uploading to S3: ${message}`);
      throw new Error("Error uploading to S3");
    }
    return this.buildUrl(key);
  }

  /** Remove por chave e PROPAGA a falha (quem chama decide: fila de limpeza). */
  async deleteKey(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  /** Lista todas as chaves sob o prefixo, com a data da última modificação. */
  async listKeys(
    prefix: string,
  ): Promise<Array<{ key: string; lastModified: Date | undefined }>> {
    const found: Array<{ key: string; lastModified: Date | undefined }> = [];
    let token: string | undefined;
    do {
      const page = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const obj of page.Contents ?? []) {
        if (obj.Key)
          found.push({ key: obj.Key, lastModified: obj.LastModified });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return found;
  }
}
