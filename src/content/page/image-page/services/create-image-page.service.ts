import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImagePageRepository } from "../repositories/image-page.repository";
import { CreateImagePageDto } from "../dto/create-image.dto";
import { ImagePageResponseDto } from "../dto/image-page-response.dto";
import { ImagePageEntity } from "../entities/image-page.entity";
import { ImageSectionEntity } from "../entities/image-section.entity";

@Injectable()
export class CreateImagePageService {
  private readonly logger = new Logger(CreateImagePageService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly routeService: RouteService,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async createImagePage(
    pageData: CreateImagePageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<ImagePageResponseDto> {
    const { title, description, public: isPublic, sections } = pageData;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    // As mídias são gravadas pelo processador fora desta transação: se algo falhar
    // depois, o banco desfaz as seções mas as linhas de mídia e os objetos ficariam.
    const mediaMap = new Map<string, MediaItemEntity[]>();

    try {
      const gallery = queryRunner.manager.create(ImagePageEntity, {
        name: title,
        description,
        public: isPublic,
      });
      const savedGallery = await queryRunner.manager.save(gallery);

      const path = await this.routeService.generateAvailablePath(
        title,
        "galeria_imagens_",
      );
      const route = await this.routeService.createRouteWithManager(
        queryRunner.manager,
        {
          title,
          subtitle: "Página de galeria de imagens",
          idToFetch: savedGallery.id,
          path,
          entityType: MediaTargetType.ImagesPage,
          description,
          entityId: savedGallery.id,
          type: RouteType.PAGE,
          image:
            "https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_imagens.png",
          public: isPublic,
        },
      );

      savedGallery.route = route;
      await queryRunner.manager.save(savedGallery);

      const sectionList: ImageSectionEntity[] = [];

      for (const sectionInput of sections) {
        const section = queryRunner.manager.create(ImageSectionEntity, {
          caption: sectionInput.caption,
          description: sectionInput.description,
          public: sectionInput.public,
          page: savedGallery,
        });

        const savedSection = await queryRunner.manager.save(section);
        sectionList.push(savedSection);

        const mediaItemsPrepared = sectionInput.mediaItems.map((item) => {
          if (item.uploadType === UploadType.UPLOAD && item.isLocalFile) {
            if (!item.originalName) {
              throw new Error("originalName field missing in upload item.");
            }
            if (!item.fieldKey || !filesDict[item.fieldKey]) {
              throw new Error(`File not found for fieldKey: ${item.fieldKey}`);
            }
          }
          return {
            ...item,
            fileField: item.fieldKey,
          };
        });

        const mediaItems =
          await this.mediaItemProcessor.processMediaItemsPolymorphic(
            mediaItemsPrepared,
            savedSection.id,
            MediaTargetType.ImagesPage,
            filesDict,
            this.awsS3Service.upload.bind(this.awsS3Service),
            this.awsS3Service.delete.bind(this.awsS3Service),
          );
        mediaMap.set(savedSection.id, mediaItems);
      }

      savedGallery.sections = sectionList;
      const finalGallery = await queryRunner.manager.save(savedGallery);

      await queryRunner.commitTransaction();
      return ImagePageResponseDto.fromEntity(finalGallery, mediaMap);
    } catch (error) {
      this.logger.error("Error creating gallery. Rolling back.", error);
      await queryRunner.rollbackTransaction();
      await this.discardCreatedMedia(mediaMap);
      throw new BadRequestException(
        "Erro ao criar a galeria. Nenhum dado foi salvo.",
      );
    } finally {
      await queryRunner.release();
    }
  }

  /** Melhor esforço: remove linhas e objetos de mídia que ficaram sem seção após o rollback. */
  private async discardCreatedMedia(
    mediaMap: Map<string, MediaItemEntity[]>,
  ): Promise<void> {
    for (const items of mediaMap.values()) {
      if (items.length === 0) continue;
      try {
        await this.mediaItemProcessor.deleteMediaItems(items, (url: string) =>
          this.awsS3Service.delete(url),
        );
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(`Mídia órfã após rollback da galeria: ${reason}`);
      }
    }
  }
}
