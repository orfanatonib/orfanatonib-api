import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteType } from 'src/infrastructure/route/route-page.entity';
import { MediaType } from 'src/shared/media/media-item/media-item.entity';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MeditationRepository } from '../meditation.repository';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { CreateMeditationDto } from '../dto/create-meditation.dto';
import { MeditationEntity } from '../entities/meditation.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';

@Injectable()
export class CreateMeditationService {
  private readonly logger = new Logger(CreateMeditationService.name);

  constructor(
    @Inject(MeditationRepository)
    private readonly meditationRepo: MeditationRepository,
    private readonly s3Service: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async create(
    dto: CreateMeditationDto,
    file?: Express.Multer.File,
  ): Promise<MeditationEntity> {
    try {
      const startDate = parseDateAsLocal(dto.startDate);
      const endDate = parseDateAsLocal(dto.endDate);

      if (startDate.getDay() !== 1)
        throw new BadRequestException('startDate must be a Monday');
      if (endDate.getDay() !== 5)
        throw new BadRequestException('endDate must be a Friday');

      const existing = await this.meditationRepo.findAllWithRelations();
      const hasConflict = existing.some((m) => {
        const s = new Date(m.startDate);
        const e = new Date(m.endDate);
        return (
          (startDate >= s && startDate <= e) ||
          (endDate >= s && endDate <= e) ||
          (startDate <= s && endDate >= e)
        );
      });

      if (hasConflict) {
        throw new BadRequestException('Conflict with dates of an existing meditation.');
      }

      const meditation = this.meditationRepo.create({
        topic: dto.topic,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days: dto.days,
      });

      const savedMeditation = await this.meditationRepo.save(meditation);

      let mediaUrl = dto.media.url?.trim() || '';
      let originalName = dto.media.originalName;
      let size = dto.media.size;

      if (dto.media.isLocalFile) {
        if (!file) throw new BadRequestException('File not sent.');
        mediaUrl = await this.s3Service.upload(file);
        originalName = file.originalname;
        size = file.size;
      }

      const mediaEntity = this.mediaItemProcessor.buildBaseMediaItem(
        {
          title: dto.media.title,
          description: dto.media.description,
          mediaType: MediaType.DOCUMENT,
          uploadType: dto.media.uploadType,
          platformType: dto.media.platformType ?? null,
          fileField: 'file',
          isLocalFile: dto.media.isLocalFile,
          url: mediaUrl,
          originalName,
          size,
        },
        savedMeditation.id,
        MediaTargetType.Meditation,
      );

      await this.mediaItemProcessor.saveMediaItem(mediaEntity);

      await this.routeService.createRoute({
        title: savedMeditation.topic,
        subtitle: '',
        idToFetch: savedMeditation.id,
        entityType:  MediaTargetType.Meditation,
        description: `Weekly meditation from ${dto.startDate} to ${dto.endDate}`,
        entityId: savedMeditation.id,
        type: RouteType.DOC,
        prefix: 'meditacao_',
        image: 'https://bucket-clubinho-galeria.s3.amazonaws.com/uploads/img_card.jpg',
        public: false,
      });

      return savedMeditation;
    } catch (error) {
      this.logger.error('Error creating meditation', error.stack);
      throw new BadRequestException(
        error?.message || 'Unexpected error creating meditation.',
      );
    }
  }
}

function parseDateAsLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
