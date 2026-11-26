import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { InformativeRepository } from "../informative.repository";

@Injectable()
export class DeleteInformativeService {
  private readonly logger = new Logger(DeleteInformativeService.name);

  constructor(
    @Inject(InformativeRepository)
    private readonly informativeRepo: InformativeRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const informative = await this.informativeRepo.findOneWithRelations(id);

    if (!informative) {
      this.logger.warn(`Banner not found: ID=${id}`);
      throw new NotFoundException("Informative banner not found");
    }

    try {
      await this.informativeRepo.removeWithRoute(informative);
    } catch (error) {
      this.logger.error(
        `Error removing banner ID=${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Erro ao remover banner.");
    }
  }
}
