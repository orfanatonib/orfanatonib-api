import { HttpException, Injectable, Logger } from "@nestjs/common";

import { ProcessException, RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

import { VISIT_MATERIAL_MESSAGES } from "../constants";
import { AppendVisitMaterialSectionsDto } from "../dto/append-visit-material-sections.dto";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { toVisitMaterialsPageResponseDto } from "../mappers/visit-material-page.mapper";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { UploadedFilesDict } from "../types";
import { toMediaBuckets } from "../utils/visit-material-payload.util";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";

/**
 * Acrescenta seções a uma página existente (publicação incremental por categoria). Diferente do `PATCH`, que trata
 * `sections` como lista completa e remove o que faltar, aqui só se cria: o que a página já tem fica intacto.
 */
@Injectable()
export class AppendVisitMaterialSectionsService {
  private readonly logger = new Logger(AppendVisitMaterialSectionsService.name);

  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly getService: GetVisitMaterialPageService,
    private readonly mediaService: VisitMaterialMediaService,
    private readonly sectionsService: VisitMaterialSectionsService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3: AwsS3Service,
  ) {}

  async execute(
    pageId: string,
    dto: AppendVisitMaterialSectionsDto,
    files: UploadedFilesDict,
  ): Promise<VisitMaterialsPageResponseDTO> {
    const page = await this.getService.findEntityOrFail(pageId);

    // Antes de gravar qualquer coisa: arquivo ausente ou categoria repetida falha aqui, sem página pela metade.
    const mediaInputs = this.mediaService.toPolymorphicItems(
      toMediaBuckets(dto),
      files,
    );
    const prepared = this.sectionsService.prepare(dto.sections, files);

    const existing = new Set(
      (await this.sectionsService.loadForPage(page.id)).map(
        ({ section }) => section.category,
      ),
    );
    for (const { input } of prepared) {
      if (existing.has(input.category)) {
        throw new RuleException(
          VISIT_MATERIAL_MESSAGES.SECTION_ALREADY_EXISTS(input.category),
          { category: input.category, pageId: page.id },
        );
      }
    }

    try {
      await this.repository.runInTransaction(async (manager) => {
        await this.sectionsService.createAll(page.id, prepared, files, manager);
        if (mediaInputs.length > 0) {
          await this.mediaItemProcessor.processMediaItemsPolymorphic(
            mediaInputs,
            page.id,
            MediaTargetType.VisitMaterialsPage,
            files,
            (file) => this.s3.upload(file),
            (url) => this.s3.delete(url),
          );
        }
      });

      this.logger.log(
        `Seções acrescentadas à página ${page.id}: ${prepared.map(({ input }) => input.category).join(", ")}`,
      );
      return this.getService.toResponse(page);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Erro ao acrescentar seções à página ${page.id}`,
        error,
      );
      throw new ProcessException(VISIT_MATERIAL_MESSAGES.APPEND_FAILED, {
        id: page.id,
      });
    }
  }
}
