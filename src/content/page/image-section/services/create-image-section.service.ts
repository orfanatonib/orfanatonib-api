import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { toPublicDisplayName } from "src/common/utils/display-name.util";
import { countMediaByType } from "../utils";
import { validateShelterPostMedia } from "../media-validation";
import { ImageSectionRepository } from "../repositories/image-section.repository";
import { CreateImageSectionDto } from "../dto/create-image-section.dto";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";
import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

/** `notifyAdmins: false` quando o autor é o próprio admin. */
export interface CreateSectionOptions {
  notifyAdmins?: boolean;
}

@Injectable()
export class CreateImageSectionService {
  private readonly logger = new Logger(CreateImageSectionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly imageSectionRepository: ImageSectionRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async createSection(
    dto: CreateImageSectionDto,
    filesDict: Record<string, Express.Multer.File>,
    authorId: string | null = null,
    options: CreateSectionOptions = {},
  ): Promise<ImageSectionResponseDto> {
    // Antes de abrir a transação: o erro chega ao usuário com a mensagem específica.
    validateShelterPostMedia(dto.mediaItems, filesDict);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const section = queryRunner.manager.create(ImageSectionEntity, {
        caption: dto.caption,
        description: dto.description,
        public: dto.public || false,
        page: null,
        author: authorId ? { id: authorId } : null,
      });

      const savedSection = await queryRunner.manager.save(section);

      this.validateFiles(dto, filesDict);

      const preparedMediaItems = dto.mediaItems.map((item) => ({
        ...item,
        fileField: item.fieldKey,
      }));

      const mediaItems: MediaItemEntity[] =
        await this.mediaItemProcessor.processMediaItemsPolymorphic(
          preparedMediaItems,
          savedSection.id,
          MediaTargetType.ImagesPage,
          filesDict,
          this.awsS3Service.upload.bind(this.awsS3Service),
          this.awsS3Service.delete.bind(this.awsS3Service),
        );

      await queryRunner.commitTransaction();

      // Recarrega com o autor para o DTO (e o aviso) trazer o nome público.
      const withAuthor = authorId
        ? await this.imageSectionRepository.findOne({
            where: { id: savedSection.id },
            relations: ["author"],
          })
        : null;

      // Quando o próprio admin publica não há o que avisar (e ninguém "aguarda aprovação").
      if (options.notifyAdmins !== false) {
        void this.notifyAdmins(
          savedSection.caption,
          mediaItems,
          toPublicDisplayName(withAuthor?.author?.name),
        );
      }

      return ImageSectionResponseDto.fromEntity(
        withAuthor ?? savedSection,
        mediaItems,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error creating section", error);
      throw new BadRequestException("Error creating section");
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Avisa a coordenação depois do commit (flag própria `email_image_shared_notification`, aplicada
   * pelo despachante); falha de e-mail nunca desfaz nem atrasa o upload.
   * O conteúdo leva só o nome público, a legenda e as contagens.
   */
  private async notifyAdmins(
    caption: string,
    mediaItems: MediaItemEntity[],
    authorName: string | null,
  ): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();
      if (adminEmails.length === 0) return;
      const { photos, videos } = countMediaByType(mediaItems);
      await this.notificationService.sendPhotoUploadedNotification(
        { authorName, caption, photoCount: photos, videoCount: videos },
        adminEmails,
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify admins about new photo: ${reason}`);
    }
  }

  private validateFiles(
    dto: CreateImageSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ) {
    for (const media of dto.mediaItems) {
      if (media.uploadType === UploadType.UPLOAD && media.isLocalFile) {
        if (!media.originalName) {
          throw new BadRequestException("Campo originalName ausente");
        }
        if (!media.fieldKey || !filesDict[media.fieldKey]) {
          throw new BadRequestException(
            `Arquivo não encontrado para fieldKey: ${media.fieldKey}`,
          );
        }
      }
    }
  }
}
