import { Injectable, Logger } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

import {
  IDEAS_SECTION_MEDIA_DEFAULTS,
  IDEAS_SECTION_MESSAGES,
} from "../constants";
import { IdeasSectionMediaItemDto } from "../dto/ideas-section-media-item.dto";
import { TO_MEDIA_TYPE, UploadedFilesDict } from "../types";

const TARGET_TYPE = MediaTargetType.IdeasSection;

/**
 * Todas as regras de mídia da seção num lugar só.
 *
 * Antes `addMedia` e `upsertMedia` viviam no serviço de atualização com ~120
 * linhas quase idênticas, e a criação usava um terceiro caminho pelo
 * processador compartilhado — três comportamentos diferentes para a mesma
 * mídia.
 */
@Injectable()
export class IdeasSectionMediaService {
  private readonly logger = new Logger(IdeasSectionMediaService.name);

  constructor(
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3: AwsS3Service,
  ) {}

  /**
   * Confere, **antes** de gravar qualquer coisa, que todo upload declarado
   * traz o campo e o arquivo. Sem isto a seção já estava no banco quando a
   * mídia falhava, e sobrava uma ideia sem conteúdo que ninguém removia.
   */
  assertUploadsResolvable(
    incoming: readonly IdeasSectionMediaItemDto[],
    files: UploadedFilesDict,
  ): void {
    for (const input of incoming) {
      if (!this.isUpload(input) || input.id) continue;

      const title = input.title || IDEAS_SECTION_MEDIA_DEFAULTS.TITLE;
      if (!input.fieldKey) {
        throw new RuleException(
          IDEAS_SECTION_MESSAGES.MISSING_FIELD_KEY(title),
        );
      }
      if (!files[input.fieldKey]) {
        throw new RuleException(IDEAS_SECTION_MESSAGES.MISSING_FILE(title));
      }
    }
  }

  /** Mídias já gravadas para a seção. */
  async findBySection(sectionId: string): Promise<MediaItemEntity[]> {
    return this.mediaItemProcessor.findMediaItemsByTarget(
      sectionId,
      TARGET_TYPE,
    );
  }

  /** Mídias de várias seções, numa consulta só. */
  async findBySections(sectionIds: string[]): Promise<MediaItemEntity[]> {
    if (sectionIds.length === 0) return [];
    return this.mediaItemProcessor.findManyMediaItemsByTargets(
      sectionIds,
      TARGET_TYPE,
    );
  }

  /**
   * Grava a lista inteira que veio no payload e remove o que ela não menciona
   * mais. A lista enviada é a verdade sobre a seção.
   */
  async replaceAll(
    sectionId: string,
    incoming: readonly IdeasSectionMediaItemDto[],
    files: UploadedFilesDict,
  ): Promise<MediaItemEntity[]> {
    const stored = await this.findBySection(sectionId);

    // Ordem segura (plano 30, P0): objeto novo → linha no banco → só então some o antigo.
    // Apagar antes deixava a linha antiga apontando para um objeto inexistente se o
    // upload ou o `upsert` seguinte falhasse.
    const tracking: FileTracking = { uploaded: [], replaced: [] };
    const saved: MediaItemEntity[] = [];
    try {
      for (const input of incoming) {
        saved.push(await this.save(input, sectionId, files, tracking));
      }
    } catch (error: unknown) {
      await this.discardObjects(tracking.uploaded);
      throw error;
    }

    await this.removeMissing(stored, incoming);
    await this.discardObjects(tracking.replaced);

    return saved;
  }

  /** Apaga as mídias da seção, inclusive os arquivos no bucket. */
  async removeAll(sectionId: string): Promise<void> {
    const stored = await this.findBySection(sectionId);
    if (stored.length === 0) return;

    await this.mediaItemProcessor.deleteMediaItems(stored, (url) =>
      this.s3.delete(url),
    );
  }

  /** Remove o que está gravado e não veio na lista nova. */
  private async removeMissing(
    stored: readonly MediaItemEntity[],
    incoming: readonly IdeasSectionMediaItemDto[],
  ): Promise<void> {
    const keep = new Set(
      incoming.map((item) => item.id).filter((id): id is string => Boolean(id)),
    );
    const toRemove = stored.filter((item) => !keep.has(item.id));

    if (toRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(toRemove, (url) =>
        this.s3.delete(url),
      );
    }
  }

  /** Grava uma mídia, seja ela nova ou já existente. */
  private async save(
    input: IdeasSectionMediaItemDto,
    sectionId: string,
    files: UploadedFilesDict,
    tracking: FileTracking,
  ): Promise<MediaItemEntity> {
    const media = this.buildBase(input, sectionId);
    const stored = input.id
      ? await this.mediaItemProcessor.findMediaItemById(input.id)
      : null;
    const file = input.fieldKey ? files[input.fieldKey] : undefined;

    if (this.isUpload(input) && file) {
      this.markReplaced(stored, tracking);
      await this.applyUpload(media, file);
      tracking.uploaded.push(media.url);
    } else if (this.isUpload(input) && stored) {
      // Upload sem arquivo novo: o item já existe e só mudou o texto.
      this.keepStoredFile(media, stored);
    } else if (this.isUpload(input)) {
      throw new RuleException(
        input.fieldKey
          ? IDEAS_SECTION_MESSAGES.MISSING_FILE(media.title)
          : IDEAS_SECTION_MESSAGES.MISSING_FIELD_KEY(media.title),
      );
    } else {
      this.markReplaced(stored, tracking);
      this.applyLink(media, input);
    }

    return this.mediaItemProcessor.upsertMediaItem(input.id, media);
  }

  /**
   * O formulário marca o upload de duas formas: pelo `uploadType` e pelo
   * `isLocalFile`. As duas valem.
   */
  private isUpload(input: IdeasSectionMediaItemDto): boolean {
    return input.uploadType === UploadType.UPLOAD || input.isLocalFile === true;
  }

  private buildBase(
    input: IdeasSectionMediaItemDto,
    sectionId: string,
  ): MediaItemEntity {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...input, mediaType: TO_MEDIA_TYPE[input.mediaType] },
      sectionId,
      TARGET_TYPE,
    );

    // Colunas `NOT NULL` sem default: sem isto o insert falha no banco.
    media.title = input.title || IDEAS_SECTION_MEDIA_DEFAULTS.TITLE;
    media.description =
      input.description ?? IDEAS_SECTION_MEDIA_DEFAULTS.DESCRIPTION;

    return media;
  }

  private async applyUpload(
    media: MediaItemEntity,
    file: Express.Multer.File,
  ): Promise<void> {
    media.platformType = undefined;
    media.url = await this.s3.upload(file);
    // O arquivo passou a morar no nosso bucket, então é local independente do
    // que o payload afirmou — senão a limpeza na exclusão o ignoraria.
    media.isLocalFile = true;
    media.originalName = file.originalname;
    media.size = file.size;
  }

  private keepStoredFile(
    media: MediaItemEntity,
    stored: MediaItemEntity,
  ): void {
    media.url = stored.url;
    media.isLocalFile = stored.isLocalFile;
    media.originalName = stored.originalName;
    media.size = stored.size;
  }

  private applyLink(
    media: MediaItemEntity,
    input: IdeasSectionMediaItemDto,
  ): void {
    media.url = input.url?.trim() ?? "";
    media.isLocalFile = false;
    media.originalName = input.originalName;
    media.size = input.size;
  }

  /** O arquivo antigo é só anotado aqui; quem apaga é `replaceAll`, depois de gravar o novo. */
  private markReplaced(
    stored: MediaItemEntity | null,
    tracking: FileTracking,
  ): void {
    if (stored?.isLocalFile && stored.url) tracking.replaced.push(stored.url);
  }

  /** Melhor esforço: um objeto que não pôde ser apagado vira registro, não falha da requisição. */
  private async discardObjects(urls: readonly string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.s3.delete(url);
      } catch (error: unknown) {
        // O objeto fica para a conciliação de mídia órfã.
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(`Objeto não apagado do bucket (${url}): ${reason}`);
      }
    }
  }
}

/** Objetos tocados numa passada: o que subiu agora e o que foi substituído. */
interface FileTracking {
  uploaded: string[];
  replaced: string[];
}
