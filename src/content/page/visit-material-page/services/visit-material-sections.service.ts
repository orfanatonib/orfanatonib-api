import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";

import { RuleException } from "src/common/exceptions";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";

import { VisitMaterialSectionInputDto } from "../dto/visit-material-section.dto";
import { VisitMaterialSectionEntity } from "../entities/visit-material-section.entity";
import {
  VISIT_MATERIAL_CATEGORY_ORDER,
  VisitMaterialCategory,
} from "../enums/visit-material-category.enum";
import { VisitMaterialSectionRepository } from "../repositories/visit-material-section.repository";
import { UploadedFilesDict, VisitMaterialSectionWithMedia } from "../types";
import { toMediaBuckets } from "../utils/visit-material-payload.util";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VISIT_MATERIAL_MESSAGES } from "../constants";

const SECTION_TARGET = MediaTargetType.VisitMaterialsSection;

/** Uma seção do payload já validada, com as mídias prontas para gravar. */
export interface PreparedSection {
  readonly input: VisitMaterialSectionInputDto;
  readonly mediaInputs: MediaItemDto[];
}

const clean = (value: string | undefined): string | null =>
  value?.trim() || null;
const positionOf = (category: VisitMaterialCategory): number =>
  VISIT_MATERIAL_CATEGORY_ORDER.indexOf(category);

/** Regras das seções por categoria de uma página de material de visita (leitura, criação, sincronização e remoção). */
@Injectable()
export class VisitMaterialSectionsService {
  constructor(
    private readonly repository: VisitMaterialSectionRepository,
    private readonly mediaService: VisitMaterialMediaService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3: AwsS3Service,
  ) {}

  /** Seções com as mídias de várias páginas, em duas consultas. */
  async loadForPages(
    pageIds: readonly string[],
  ): Promise<Map<string, VisitMaterialSectionWithMedia[]>> {
    const result = new Map<string, VisitMaterialSectionWithMedia[]>();
    const sections = await this.repository.findByPageIds(pageIds);
    if (sections.length === 0) return result;

    const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      sections.map((section) => section.id),
      SECTION_TARGET,
    );
    const mediaBySection = new Map<string, MediaItemEntity[]>();
    for (const item of media) {
      const bucket = mediaBySection.get(item.targetId);
      if (bucket) bucket.push(item);
      else mediaBySection.set(item.targetId, [item]);
    }
    for (const section of sections) {
      const list = result.get(section.pageId) ?? [];
      list.push({ section, media: mediaBySection.get(section.id) ?? [] });
      result.set(section.pageId, list);
    }
    return result;
  }

  async loadForPage(pageId: string): Promise<VisitMaterialSectionWithMedia[]> {
    return (await this.loadForPages([pageId])).get(pageId) ?? [];
  }

  /**
   * Valida o payload ANTES de gravar qualquer coisa: uma seção por categoria e cada mídia com seu arquivo/URL.
   * Um arquivo ausente falha aqui, sem deixar página pela metade.
   */
  prepare(
    sections: readonly VisitMaterialSectionInputDto[],
    files: UploadedFilesDict,
  ): PreparedSection[] {
    const seen = new Set<VisitMaterialCategory>();
    for (const section of sections) {
      if (seen.has(section.category)) {
        throw new RuleException(
          VISIT_MATERIAL_MESSAGES.DUPLICATE_CATEGORY(section.category),
          {
            category: section.category,
          },
        );
      }
      seen.add(section.category);
    }
    return sections.map((input) => ({
      input,
      mediaInputs: this.mediaService.toPolymorphicItems(
        toMediaBuckets(input),
        files,
      ),
    }));
  }

  /** Cria as seções de uma página nova (dentro da transação da página). */
  async createAll(
    pageId: string,
    prepared: readonly PreparedSection[],
    files: UploadedFilesDict,
    manager: EntityManager,
  ): Promise<VisitMaterialSectionWithMedia[]> {
    const created: VisitMaterialSectionWithMedia[] = [];
    for (const item of prepared)
      created.push(await this.createOne(pageId, item, files, manager));
    return created;
  }

  /** Reconcilia as seções da página com o payload: cria, atualiza (por categoria) e remove as que saíram. */
  async sync(
    pageId: string,
    prepared: readonly PreparedSection[],
    files: UploadedFilesDict,
  ): Promise<void> {
    const stored = await this.repository.findByPageId(pageId);
    const incoming = new Set(prepared.map((item) => item.input.category));

    for (const section of stored) {
      if (!incoming.has(section.category)) await this.removeOne(section);
    }
    for (const item of prepared) {
      const existing = stored.find(
        (section) => section.category === item.input.category,
      );
      if (existing) await this.updateOne(existing, item, files);
      else await this.createOne(pageId, item, files);
    }
  }

  /** Remove as mídias (e os arquivos) de todas as seções da página; as linhas das seções caem junto com a página. */
  async removeAllMedia(pageId: string): Promise<void> {
    for (const section of await this.repository.findByPageId(pageId))
      await this.removeMedia(section);
  }

  private async createOne(
    pageId: string,
    { input, mediaInputs }: PreparedSection,
    files: UploadedFilesDict,
    manager?: EntityManager,
  ): Promise<VisitMaterialSectionWithMedia> {
    const section = await this.repository.save(
      this.repository.create(
        {
          pageId,
          category: input.category,
          title: clean(input.title),
          description: clean(input.description),
          position: positionOf(input.category),
        },
        manager,
      ),
      manager,
    );
    const media = await this.mediaItemProcessor.processMediaItemsPolymorphic(
      mediaInputs,
      section.id,
      SECTION_TARGET,
      files,
      (file) => this.s3.upload(file),
      (url) => this.s3.delete(url),
    );
    return { section, media };
  }

  private async updateOne(
    section: VisitMaterialSectionEntity,
    { input }: PreparedSection,
    files: UploadedFilesDict,
  ): Promise<void> {
    section.title = clean(input.title);
    section.description = clean(input.description);
    section.position = positionOf(section.category);
    await this.repository.save(section);

    const stored = await this.mediaService.findGroupedByPage(
      section.id,
      SECTION_TARGET,
    );
    const buckets = VisitMaterialMediaService.toEntries(toMediaBuckets(input));
    for (const [mediaType, incoming] of buckets) {
      await this.mediaService.removeMissing(
        stored.get(mediaType) ?? [],
        incoming,
      );
    }
    for (const [mediaType, incoming] of buckets) {
      for (const media of incoming)
        await this.persist(media, section.id, mediaType, files);
    }
  }

  private persist(
    media: MediaItemDto,
    sectionId: string,
    mediaType: MediaType,
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity> {
    return media.id
      ? this.mediaService.upsert(
          media,
          sectionId,
          mediaType,
          files,
          SECTION_TARGET,
        )
      : this.mediaService.add(
          media,
          sectionId,
          mediaType,
          files,
          SECTION_TARGET,
        );
  }

  private async removeOne(section: VisitMaterialSectionEntity): Promise<void> {
    await this.removeMedia(section);
    await this.repository.remove(section);
  }

  private async removeMedia(
    section: VisitMaterialSectionEntity,
  ): Promise<void> {
    const media = await this.mediaService.findAllByPage(
      section.id,
      SECTION_TARGET,
    );
    if (media.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(media, (url) =>
        this.s3.delete(url),
      );
    }
  }
}
