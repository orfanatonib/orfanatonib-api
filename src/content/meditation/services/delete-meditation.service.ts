import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RouteService } from 'src/infrastructure/route/route.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MeditationRepository } from '../meditation.repository';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';

@Injectable()
export class DeleteMeditationService {
  private readonly logger = new Logger(DeleteMeditationService.name);

  constructor(
    private readonly meditationRepo: MeditationRepository,
    private readonly s3Service: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async remove(id: string): Promise<void> {

    const meditation = await this.meditationRepo.findOneWithRelations(id);
    if (!meditation) {
      this.logger.warn(`Meditation not found: ID=${id}`);
      throw new NotFoundException('Meditation not found');
    }

    const media = await this.mediaItemProcessor.findMediaItemsByTarget(id,  MediaTargetType.Meditation);
    if (media.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(media, this.s3Service.delete.bind(this.s3Service));
    }

    await this.routeService.removeRouteByEntity( MediaTargetType.Meditation, id);

    await this.meditationRepo.delete(id);
  }
}
