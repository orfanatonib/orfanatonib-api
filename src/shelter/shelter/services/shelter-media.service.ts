import { Injectable } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import { KeyedQueue } from "src/common/utils/keyed-queue";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import {
  SHELTER_MEDIA_DEFAULT_DESCRIPTION,
  SHELTER_MEDIA_DEFAULT_TITLE,
  SHELTER_MEDIA_TARGET,
  SHELTER_MESSAGES,
  USER_MEDIA_TARGET,
} from "../constants";
import { UploadedFilesDict } from "../types";
import { ShelterMediaInput } from "../utils/shelter-payload.util";

/**
 * Toda a mídia do abrigo em um lugar: a foto principal e as fotos de perfil de
 * quem está nas equipes. Antes essa lógica estava duplicada entre os serviços
 * de leitura e de atualização, com comportamentos que já divergiam.
 */
const SHELTER_STORAGE_ENTITY = "Shelter";

@Injectable()
export class ShelterMediaService {
  private readonly photoQueue = new KeyedQueue();

  constructor(
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /** Dentre várias mídias do mesmo alvo, a mais recente vence. */
  private newestByTarget(
    items: MediaItemEntity[],
  ): Map<string, MediaItemEntity> {
    const newest = new Map<string, MediaItemEntity>();

    for (const item of items) {
      const previous = newest.get(item.targetId);
      if (!previous) {
        newest.set(item.targetId, item);
        continue;
      }
      const previousAt = previous.createdAt?.getTime() ?? 0;
      const currentAt = item.createdAt?.getTime() ?? 0;
      if (currentAt >= previousAt) newest.set(item.targetId, item);
    }

    return newest;
  }

  /** Anexa a foto principal de cada abrigo, em uma única consulta. */
  async attachShelterPhotos(
    shelters: ShelterEntity[],
  ): Promise<ShelterEntity[]> {
    if (shelters.length === 0) return shelters;

    const items = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      shelters.map((shelter) => shelter.id),
      SHELTER_MEDIA_TARGET,
    );
    const newest = this.newestByTarget(items);

    for (const shelter of shelters) {
      shelter.mediaItem = newest.get(shelter.id) ?? null;
    }

    return shelters;
  }

  /**
   * Anexa a foto de perfil de cada líder e membro das equipes do abrigo,
   * também em uma única consulta.
   */
  async attachTeamUserPhotos(shelter: ShelterEntity): Promise<void> {
    const users = (shelter.teams ?? []).flatMap((team) => [
      ...(team.leaders ?? []).map((leader) => leader.user),
      ...(team.members ?? []).map((member) => member.user),
    ]);

    const userIds = [
      ...new Set(users.filter((user) => user?.id).map((user) => user.id)),
    ];
    if (userIds.length === 0) return;

    const items = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      userIds,
      USER_MEDIA_TARGET,
    );
    const newest = this.newestByTarget(items);

    for (const user of users) {
      if (user?.id) user.imageProfile = newest.get(user.id) ?? null;
    }
  }

  /** Leitura completa: foto do abrigo e das pessoas das equipes. */
  async attachAll(shelters: ShelterEntity[]): Promise<ShelterEntity[]> {
    await this.attachShelterPhotos(shelters);
    for (const shelter of shelters) {
      await this.attachTeamUserPhotos(shelter);
    }
    return shelters;
  }

  async findMainPhoto(shelterId: string): Promise<MediaItemEntity | null> {
    return this.mediaItemProcessor.findMediaItemByTarget(
      shelterId,
      SHELTER_MEDIA_TARGET,
    );
  }

  /**
   * Grava a foto principal do abrigo — criando ou substituindo — e devolve a
   * URL resultante. Ordem segura para o bucket: envia o novo → grava no banco
   * → só então apaga o antigo. Se algo falha antes do commit, o novo é
   * descartado e o antigo segue referenciado (sem órfão nem referência quebrada).
   */
  /**
   * Trocas simultâneas da foto do MESMO abrigo rodam uma de cada vez: sem isso as duas leem a foto
   * antiga, as duas enviam um objeto novo e só uma fica referenciada (a outra vira órfã no bucket).
   */
  upsertMainPhoto(
    shelterId: string,
    input: ShelterMediaInput,
    files: UploadedFilesDict,
  ): Promise<string> {
    return this.photoQueue.run(shelterId, () =>
      this.replaceMainPhoto(shelterId, input, files),
    );
  }

  private async replaceMainPhoto(
    shelterId: string,
    input: ShelterMediaInput,
    files: UploadedFilesDict,
  ): Promise<string> {
    const existing = await this.findMainPhoto(shelterId);
    // title e description são NOT NULL no banco; o payload os traz opcionais.
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      {
        ...input,
        title: input.title ?? SHELTER_MEDIA_DEFAULT_TITLE,
        description: input.description ?? SHELTER_MEDIA_DEFAULT_DESCRIPTION,
        mediaType: MediaType.IMAGE,
      },
      shelterId,
      SHELTER_MEDIA_TARGET,
    );

    const batch = this.mediaStorage.newBatch();
    let saved: MediaItemEntity;
    try {
      if (input.uploadType === UploadType.UPLOAD && input.isLocalFile) {
        const file = files[input.fieldKey ?? ""];
        if (!file) {
          throw new RuleException(
            SHELTER_MESSAGES.MEDIA_FILE_MISSING(
              input.fieldKey,
              Object.keys(files),
            ),
          );
        }

        await this.mediaStorage.uploadAll(
          [
            {
              file,
              mediaType: MediaType.IMAGE,
              entity: SHELTER_STORAGE_ENTITY,
              ownerId: shelterId,
            },
          ],
          batch,
        );
        const [uploaded] = batch.objects;
        media.url = uploaded.url;
        media.storageKey = uploaded.key;
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
      } else if (input.url) {
        media.url = input.url;
        media.isLocalFile = false;
      } else {
        throw new RuleException(SHELTER_MESSAGES.MEDIA_SOURCE_REQUIRED);
      }

      saved = existing
        ? await this.mediaItemProcessor.upsertMediaItem(existing.id, media)
        : await this.mediaItemProcessor.saveMediaItem(media);
    } catch (error) {
      await batch.discard();
      throw error;
    }
    batch.commit();

    if (existing?.isLocalFile && existing.url) {
      await this.mediaStorage.deleteAfterCommit([existing.url]);
    }

    return saved.url;
  }

  /** Remove do banco a mídia do abrigo e, depois, os objetos do bucket (falha vai para a fila de limpeza). */
  async removeAllForShelter(shelterId: string): Promise<number> {
    const items = await this.mediaItemProcessor.findMediaItemsByTarget(
      shelterId,
      SHELTER_MEDIA_TARGET,
    );
    if (items.length === 0) return 0;

    const urls =
      await this.mediaItemProcessor.removeMediaItemsKeepingFiles(items);
    await this.mediaStorage.deleteAfterCommit(urls);
    return items.length;
  }
}
