import { HttpException, Injectable, Logger } from "@nestjs/common";
import { ProcessException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/aws-s3.service";
import { RouteService } from "src/infrastructure/route/route.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VISIT_MATERIAL_MESSAGES } from "../constants";

@Injectable()
export class DeleteVisitMaterialPageService {
  private readonly logger = new Logger(DeleteVisitMaterialPageService.name);

  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly getService: GetVisitMaterialPageService,
    private readonly mediaService: VisitMaterialMediaService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly routeService: RouteService,
    private readonly s3: AwsS3Service,
  ) {}

  async execute(id: string): Promise<void> {
    // Resolved outside the try so a missing page stays a 404 instead of being
    // flattened into a generic failure.
    const page = await this.getService.findEntityOrFail(id);

    try {
      const mediaItems = await this.mediaService.findAllByPage(page.id);
      if (mediaItems.length > 0) {
        await this.mediaItemProcessor.deleteMediaItems(mediaItems, (url) =>
          this.s3.delete(url),
        );
      }

      await this.repository.runInTransaction(async (manager) => {
        if (
          page.route?.id &&
          (await this.routeService.findById(page.route.id))
        ) {
          await this.routeService.removeRoute(page.route.id);
        }
        await this.repository.remove(page, manager);
      });

      this.logger.log(`Visit material page deleted: ${id}`);
    } catch (error) {
      // Preserva o código específico de qualquer exceção HTTP já classificada,
      // venha do módulo ou de um colaborador compartilhado.
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error deleting visit material page ${id}`, error);
      throw new ProcessException(VISIT_MATERIAL_MESSAGES.DELETE_FAILED, { id });
    }
  }
}
