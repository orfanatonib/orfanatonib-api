import { Injectable } from "@nestjs/common";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

import { IdeasSectionMediaItemDto } from "../dto/ideas-section-media-item.dto";

import { CreateIdeasSectionDto } from "../dto/create-ideas-section.dto";
import { IdeasSectionResponseDto } from "../dto/ideas-section-response.dto";
import { toIdeasSectionDto } from "../mappers/ideas-section.mapper";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { UploadedFilesDict } from "../types";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

/** Uma ideia compartilhada nasce sem página; a vinculação é um passo à parte. */
@Injectable()
export class CreateIdeasSectionService {
  constructor(
    private readonly repository: IdeasSectionRepository,
    private readonly mediaService: IdeasSectionMediaService,
  ) {}

  async execute(
    dto: CreateIdeasSectionDto,
    files: UploadedFilesDict,
    userId: string,
  ): Promise<IdeasSectionResponseDto> {
    const incoming = dto.medias ?? [];
    // Recusa aqui o que a mídia recusaria depois: assim nada é gravado.
    this.mediaService.assertUploadsResolvable(incoming, files);

    const section = await this.repository.createUnattached(
      {
        title: dto.title,
        description: dto.description,
        public: dto.public ?? false,
      },
      userId,
    );

    const medias = await this.persistMedia(section.id, incoming, files);

    // A seção recém-criada carrega o autor só como `{ id }`; a releitura é o
    // que faz a resposta trazer nome e contato de quem enviou.
    const saved = await this.repository.findById(section.id);
    return toIdeasSectionDto(saved ?? section, medias);
  }

  /**
   * Se a mídia falhar depois da seção gravada — um erro do S3, por exemplo —
   * a seção é desfeita. A operação não é transacional porque o upload sai do
   * banco, então a compensação é explícita.
   */
  private async persistMedia(
    sectionId: string,
    incoming: readonly IdeasSectionMediaItemDto[],
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity[]> {
    try {
      return await this.mediaService.replaceAll(sectionId, incoming, files);
    } catch (error) {
      await this.mediaService.removeAll(sectionId).catch(() => undefined);
      await this.repository.deleteById(sectionId);
      throw error;
    }
  }
}
