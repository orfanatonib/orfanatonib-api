import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
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

    const key = `${this.environment}/uploads/${Date.now()}_${sanitizedFilename}`;
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
    } catch (err: any) {
      this.logger.error(`Error uploading to S3: ${err.message}`);
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
    } catch (err: any) {
      this.logger.error(`Error deleting from S3: ${err.message}`);
    }
  }
}
