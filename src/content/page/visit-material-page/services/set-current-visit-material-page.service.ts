import { Injectable, Logger } from "@nestjs/common";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";

/**
 * Promotes one page to "current week". Demoting the previous one and promoting
 * the new one is a two-write invariant, so both happen in a single transaction.
 */
@Injectable()
export class SetCurrentVisitMaterialPageService {
  private readonly logger = new Logger(SetCurrentVisitMaterialPageService.name);

  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly getService: GetVisitMaterialPageService,
  ) {}

  async execute(id: string): Promise<VisitMaterialsPageResponseDTO> {
    const page = await this.getService.findEntityOrFail(id);
    const previous = await this.repository.findCurrentWeek();

    await this.repository.runInTransaction(async (manager) => {
      if (previous && previous.id !== page.id) {
        previous.currentWeek = false;
        previous.route.current = false;
        await this.repository.save(previous, manager);
      }

      page.currentWeek = true;
      page.route.current = true;
      page.route.public = true;
      await this.repository.save(page, manager);
    });

    this.logger.log(`Current visit material page set: ${id}`);
    return this.getService.findOne(id);
  }
}
