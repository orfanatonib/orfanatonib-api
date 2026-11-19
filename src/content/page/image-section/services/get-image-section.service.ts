import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ImageSectionRepository } from "../repositories/image-section.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";
import { FeedSectionContextDto } from "../dto/feed-section-context.dto";
import { toFeedSectionContext } from "../utils";
import { In } from "typeorm";

@Injectable()
export class GetImageSectionService {
  private readonly logger = new Logger(GetImageSectionService.name);

  constructor(
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(authorId?: string): Promise<ImageSectionResponseDto[]> {
    const sections = await this.sectionRepository.findAllOrfaSections(authorId);
    const sectionIds = sections.map((section) => section.id);

    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        sectionIds,
        MediaTargetType.ImagesPage,
      );

    const mediaMap = new Map<string, typeof mediaItems>();
    for (const item of mediaItems) {
      if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
      mediaMap.get(item.targetId)!.push(item);
    }

    return sections.map((section) =>
      ImageSectionResponseDto.fromEntity(
        section,
        mediaMap.get(section.id) || [],
      ),
    );
  }

  /**
   * Garante que a publicação existe no feed (anexada a uma galeria) e é visível
   * para quem pergunta: visitante só enxerga seção e galeria públicas; com
   * sessão, todas — as mesmas regras de `GET /image-pages/:id/sections`.
   * Sem permissão devolve 404 (não revela a existência).
   */
  async assertFeedSectionVisible(
    sectionId: string,
    loggedIn: boolean,
  ): Promise<void> {
    const section = await this.sectionRepository.findPublishedById(sectionId);
    const hidden =
      !section || (!loggedIn && !(section.public && section.page?.public));
    if (hidden) throw new NotFoundException("Publicação não encontrada.");
  }

  /**
   * Legenda e capa de várias publicações do feed, em lote (sem N+1). Ids que não
   * existem ficam de fora do mapa.
   */
  async findFeedContexts(
    sectionIds: string[],
  ): Promise<Map<string, FeedSectionContextDto>> {
    const contexts = new Map<string, FeedSectionContextDto>();
    if (sectionIds.length === 0) return contexts;
    const sections = await this.sectionRepository.find({
      where: { id: In(sectionIds) },
    });
    const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      sectionIds,
      MediaTargetType.ImagesPage,
    );
    for (const section of sections) {
      contexts.set(section.id, toFeedSectionContext(section, media));
    }
    return contexts;
  }

  async findOne(id: string): Promise<ImageSectionResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ["author"],
    });
    if (!section) {
      throw new NotFoundException(`Seção com id=${id} não encontrada`);
    }

    const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
      section.id,
      MediaTargetType.ImagesPage,
    );

    return ImageSectionResponseDto.fromEntity(section, mediaItems);
  }
}
