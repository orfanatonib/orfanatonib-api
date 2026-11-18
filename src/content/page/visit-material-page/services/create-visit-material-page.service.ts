import { HttpException, Injectable, Logger } from "@nestjs/common";
import { ProcessException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { CreateVisitMaterialsPageDto } from "../dto/create-visit-material-page.dto";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { TestamentType } from "../enums/testament-type.enum";
import { toVisitMaterialsPageResponseDto } from "../mappers/visit-material-page.mapper";
import { toMediaBuckets } from "../utils/visit-material-payload.util";
import { UploadedFilesDict } from "../types";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import {
  VISIT_MATERIAL_MESSAGES,
  VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
  VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
  VISIT_MATERIAL_ROUTE_PATH_PREFIX,
} from "../constants";

@Injectable()
export class CreateVisitMaterialPageService {
  private readonly logger = new Logger(CreateVisitMaterialPageService.name);

  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly mediaService: VisitMaterialMediaService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly routeService: RouteService,
    private readonly s3: AwsS3Service,
  ) {}

  async execute(
    dto: CreateVisitMaterialsPageDto,
    files: UploadedFilesDict,
  ): Promise<VisitMaterialsPageResponseDTO> {
    // Built before the transaction: a payload missing a fieldKey must fail
    // before anything is written.
    const mediaInputs = this.mediaService.toPolymorphicItems(
      toMediaBuckets(dto),
      files,
    );

    try {
      const result = await this.repository.runInTransaction(async (manager) => {
        const page = await this.repository.save(
          this.repository.create(
            {
              title: dto.pageTitle,
              subtitle: dto.pageSubtitle,
              description: dto.pageDescription,
              testament: dto.testament ?? TestamentType.OLD_TESTAMENT,
            },
            manager,
          ),
          manager,
        );

        const path = await this.routeService.generateAvailablePath(
          dto.pageTitle,
          VISIT_MATERIAL_ROUTE_PATH_PREFIX,
        );
        page.route = await this.routeService.createRouteWithManager(manager, {
          title: dto.pageTitle,
          subtitle: dto.pageSubtitle,
          description: dto.pageDescription,
          path,
          type: RouteType.PAGE,
          entityId: page.id,
          idToFetch: page.id,
          entityType: VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
          image: VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
          public: true,
          current: false,
        });
        const savedPage = await this.repository.save(page, manager);

        const mediaItems =
          await this.mediaItemProcessor.processMediaItemsPolymorphic(
            mediaInputs,
            savedPage.id,
            MediaTargetType.VisitMaterialsPage,
            files,
            (file) => this.s3.upload(file),
(url) => this.s3.delete(url),
          );

        return { savedPage, mediaItems };
      });

      this.logger.log(`Visit material page created: ${result.savedPage.id}`);
      return toVisitMaterialsPageResponseDto(
        result.savedPage,
        result.mediaItems,
      );
    } catch (error) {
      // Preserva o código específico de qualquer exceção HTTP já classificada,
      // venha do módulo ou de um colaborador compartilhado.
      if (error instanceof HttpException) throw error;
      this.logger.error("Error creating visit material page", error);
      throw new ProcessException(VISIT_MATERIAL_MESSAGES.CREATE_FAILED);
    }
  }
}
