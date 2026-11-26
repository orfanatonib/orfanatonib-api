import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ImageSectionReviewStatus } from "src/content/page/image-section/enums/image-section-review-status.enum";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImagePageTransactionRepository } from "../repositories/image-page-transaction.repository";
import {
  IMAGE_PAGE_ROUTE_IMAGE,
  IMAGE_PAGE_ROUTE_PATH_PREFIX,
} from "../constants";
import { CreateImagePageDto } from "../dto/create-image.dto";
import { ImagePageResponseDto } from "../dto/image-page-response.dto";
import { ImageSectionEntity } from "../entities/image-section.entity";

@Injectable()
export class CreateImagePageService {
  private readonly logger = new Logger(CreateImagePageService.name);

  constructor(
    private readonly transactions: ImagePageTransactionRepository,
    private readonly routeService: RouteService,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async createImagePage(
    pageData: CreateImagePageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<ImagePageResponseDto> {
    const { title, description, public: isPublic, sections } = pageData;

    this.assertUploadsAvailable(sections, filesDict);

    // As mídias são gravadas pelo processador fora desta transação: se algo falhar
    // depois, o banco desfaz as seções mas as linhas de mídia e os objetos ficariam.
    const mediaMap = new Map<string, MediaItemEntity[]>();

    try {
      return await this.transactions.run(async (tx) => {
        const savedGallery = await tx.savePage({
          name: title,
          description,
          public: isPublic,
        });

        const path = await this.routeService.generateAvailablePath(
          title,
          IMAGE_PAGE_ROUTE_PATH_PREFIX,
        );
        savedGallery.route = await this.routeService.createRouteWithManager(
          tx.manager,
          {
            title,
            subtitle: "Página de galeria de imagens",
            idToFetch: savedGallery.id,
            path,
            entityType: MediaTargetType.ImagesPage,
            description,
            entityId: savedGallery.id,
            type: RouteType.PAGE,
            image: IMAGE_PAGE_ROUTE_IMAGE,
            public: isPublic,
          },
        );
        await tx.savePage(savedGallery);

        const sectionList: ImageSectionEntity[] = [];
        for (const sectionInput of sections) {
          const savedSection = await tx.saveSection({
            caption: sectionInput.caption,
            description: sectionInput.description,
            public: sectionInput.public,
            page: savedGallery,
            // Curadoria do admin: já nasce aprovada.
            reviewStatus: ImageSectionReviewStatus.APPROVED,
          });
          sectionList.push(savedSection);

          const mediaItems =
            await this.mediaItemProcessor.processMediaItemsPolymorphic(
              sectionInput.mediaItems.map((item) => ({
                ...item,
                fileField: item.fieldKey,
              })),
              savedSection.id,
              MediaTargetType.ImagesPage,
              filesDict,
              (file) => this.awsS3Service.upload(file),
              (url) => this.awsS3Service.delete(url),
            );
          mediaMap.set(savedSection.id, mediaItems);
        }

        savedGallery.sections = sectionList;
        const finalGallery = await tx.savePage(savedGallery);
        return ImagePageResponseDto.fromEntity(finalGallery, mediaMap);
      });
    } catch (error) {
      this.logger.error("Error creating gallery. Rolling back.", error);
      await this.discardCreatedMedia(mediaMap);
      throw new BadRequestException(
        "Erro ao criar a galeria. Nenhum dado foi salvo.",
      );
    }
  }

  /** Falha antes de gravar ou enviar qualquer coisa: todo upload declarado precisa ter arquivo. */
  private assertUploadsAvailable(
    sections: CreateImagePageDto["sections"],
    filesDict: Record<string, Express.Multer.File>,
  ): void {
    for (const section of sections) {
      for (const item of section.mediaItems) {
        if (item.uploadType !== UploadType.UPLOAD || !item.isLocalFile) {
          continue;
        }
        if (!item.originalName) {
          throw new BadRequestException(
            "originalName field missing in upload item.",
          );
        }
        if (!item.fieldKey || !filesDict[item.fieldKey]) {
          throw new BadRequestException(
            `File not found for fieldKey: ${item.fieldKey}`,
          );
        }
      }
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
