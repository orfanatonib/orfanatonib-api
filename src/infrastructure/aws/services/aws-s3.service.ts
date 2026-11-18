import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

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

  async upload(file: Express.Multer.File): Promise<string> {
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
      if (this.endpoint) {
        return `${this.endpoint}/${this.bucketName}/${key}`;
      }
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error uploading to S3: ${message}`);
      throw new Error("Error uploading to S3");
    }
  }

  async delete(url: string): Promise<void> {
    let key = url.split(`${this.bucketName}.s3.amazonaws.com/`)[1];
    if (!key && url.includes(`/${this.bucketName}/`)) {
      key = url.split(`/${this.bucketName}/`)[1];
    }

    if (!key) {
      this.logger.warn(`Could not extract S3 key from URL: ${url}`);
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
    }
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
