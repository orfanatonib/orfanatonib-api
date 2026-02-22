import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { AtendenteRepository } from '../atendente.repository';

@Injectable()
export class DeleteAtendenteService {
  private readonly logger = new Logger(DeleteAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async execute(id: string): Promise<void> {
    const atendente = await this.atendenteRepo.findById(id);
    if (!atendente) {
      throw new NotFoundException(`Antecedente criminal with id ${id} not found.`);
    }

    try {
      const [estadualItems, federalItems, legacyItems] = await Promise.all([
        this.mediaProcessor.findMediaItemsByTarget(id, MediaTargetType.AtendenteEstadual),
        this.mediaProcessor.findMediaItemsByTarget(id, MediaTargetType.AtendenteFederal),
        this.mediaProcessor.findMediaItemsByTarget(id, MediaTargetType.Atendente),
      ]);
      const allMedia = [...estadualItems, ...federalItems, ...legacyItems];
      if (allMedia.length > 0) {
        await this.mediaProcessor.deleteMediaItems(
          allMedia,
          this.s3Service.delete.bind(this.s3Service),
        );
        this.logger.log(`Deleted ${allMedia.length} media item(s) and S3 file(s) for antecedente criminal ${id}`);
      }
      await this.atendenteRepo.remove(id);
      this.logger.log(`Antecedente criminal ${id} deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error deleting antecedente criminal ${id}`, (error as Error).stack);
      throw new InternalServerErrorException('Error deleting antecedente criminal');
    }
  }
}
