import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { AtendenteRepository } from "../atendente.repository";

@Injectable()
export class DeleteAtendenteService {
  private readonly logger = new Logger(DeleteAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(id: string): Promise<void> {
    const atendente = await this.atendenteRepo.findById(id);
    if (!atendente) {
      throw new NotFoundException(
        `Antecedente criminal with id ${id} not found.`,
      );
    }

    try {
      const [estadualItems, federalItems, legacyItems] = await Promise.all([
        this.mediaProcessor.findMediaItemsByTarget(
          id,
          MediaTargetType.AtendenteEstadual,
        ),
        this.mediaProcessor.findMediaItemsByTarget(
          id,
          MediaTargetType.AtendenteFederal,
        ),
        this.mediaProcessor.findMediaItemsByTarget(
          id,
          MediaTargetType.Atendente,
        ),
      ]);
      const allMedia = [...estadualItems, ...federalItems, ...legacyItems];
      // Cadastro e linhas saem na MESMA transação; PDFs (dado sensível) saem do bucket depois do commit, com fila de
      // limpeza se a remoção falhar.
      const fileUrls = await this.atendenteRepo.runInTransaction(
        async (manager) => {
          await this.atendenteRepo.remove(id, manager);
          return this.mediaProcessor.removeMediaItemsKeepingFiles(
            allMedia,
            manager,
          );
        },
      );
      await this.mediaStorage.deleteAfterCommit(fileUrls);
      this.logger.log(
        `Deleted ${allMedia.length} media item(s) for antecedente criminal ${id}`,
      );
      this.logger.log(`Antecedente criminal ${id} deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Error deleting antecedente criminal ${id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        "Error deleting antecedente criminal",
      );
    }
  }
}
