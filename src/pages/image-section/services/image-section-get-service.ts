import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ImageSectionRepository } from '../repository/image-section.repository';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { ImageSectionResponseDto } from '../dto/image-section-response.dto';

@Injectable()
export class ImageSectionGetService {
  private readonly logger = new Logger(ImageSectionGetService.name);

  constructor(
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(): Promise<ImageSectionResponseDto[]> {
    
    const sections = await this.sectionRepository.findAllOrfaSections();
    const sectionIds = sections.map((section) => section.id);

    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, MediaTargetType.ImagesPage);

    const mediaMap = new Map<string, typeof mediaItems>();
    for (const item of mediaItems) {
      if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
      mediaMap.get(item.targetId)!.push(item);
    }

    return sections.map((section) => 
      ImageSectionResponseDto.fromEntity(section, mediaMap.get(section.id) || [])
    );
  }

  async findOne(id: string): Promise<ImageSectionResponseDto> {
    
    const section = await this.sectionRepository.findOneBy({ id });
    if (!section) {
      throw new NotFoundException(`Seção com id=${id} não encontrada`);
    }

    const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(section.id, MediaTargetType.ImagesPage);
    
    return ImageSectionResponseDto.fromEntity(section, mediaItems);
  }
}
