import { Injectable, Logger } from "@nestjs/common";
import { IntegrationRepository } from "../integration.repository";
import { CreateIntegrationDto } from "../dto/create-integration.dto";
import { IntegrationResponseDto } from "../dto/integration-response.dto";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaType,
  UploadType,
  MediaItemEntity,
} from "src/shared/media/media-item/media-item.entity";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";

@Injectable()
export class CreateIntegrationService {
  private readonly logger = new Logger(CreateIntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async execute(
    dto: CreateIntegrationDto,
    files?: Express.Multer.File[],
  ): Promise<IntegrationResponseDto> {
    const integration = await this.repository.create({
      name: dto.name,
      phone: dto.phone,
      gaLeader: dto.gaLeader,
      baptized: dto.baptized,
      churchYears: dto.churchYears,
      previousMinistry: dto.previousMinistry,
      integrationYear: dto.integrationYear,
    });

    const media: MediaItemEntity[] = [];

    if (dto.images && dto.images.length > 0) {
      const uploadedFiles: { [key: string]: string } = {};

      for (let i = 0; i < dto.images.length; i++) {
        const imageDto = dto.images[i];
        let mediaUrl = imageDto.url?.trim() || "";
        let uploadType = UploadType.LINK;
        let isLocalFile = imageDto.isLocalFile || false;
        let originalName: string | undefined;
        let size: number | undefined;

        if (files && files.length > 0 && !mediaUrl) {
          const fileIndex = Math.min(i, files.length - 1);
          const file = files[fileIndex];

          if (!uploadedFiles[file.originalname]) {
            uploadedFiles[file.originalname] =
              await this.s3Service.upload(file);
          }

          mediaUrl = uploadedFiles[file.originalname];
          uploadType = UploadType.UPLOAD;
          isLocalFile = true;
          originalName = file.originalname;
          size = file.size;
        }

        if (mediaUrl) {
          const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
            {
              title: imageDto.title || dto.name || "Integration image",
              description: imageDto.description || "",
              mediaType: MediaType.IMAGE,
              uploadType,
              url: mediaUrl,
              isLocalFile,
              originalName,
              size,
            },
            integration.id,
            MediaTargetType.Integration,
          );

          const savedMedia =
            await this.mediaProcessor.saveMediaItem(mediaEntity);
          media.push(savedMedia);
        }
      }
    } else if (files && files.length > 0) {
      for (const file of files) {
        const mediaUrl = await this.s3Service.upload(file);
        const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
          {
            title: dto.name || "Integration image",
            description: "",
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.UPLOAD,
            url: mediaUrl,
            isLocalFile: true,
            originalName: file.originalname,
            size: file.size,
          },
          integration.id,
          MediaTargetType.Integration,
        );

        const savedMedia = await this.mediaProcessor.saveMediaItem(mediaEntity);
        media.push(savedMedia);
      }
    }

    return IntegrationResponseDto.fromEntity(integration, media);
  }
}
