import { Injectable, Logger } from "@nestjs/common";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { SheltersRepository } from "../repositories/shelters.repository";
import { UpdateShelterDto } from "../dto/update-shelter.dto";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import { assertCanManageShelters } from "../utils/shelter-access.util";
import { ShelterMediaInput } from "../utils/shelter-payload.util";
import { ShelterAccessContext, UploadedFilesDict } from "../types";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { ShelterRouteService } from "./shelter-route.service";
import { ShelterTeamsService } from "./shelter-teams.service";

@Injectable()
export class UpdateSheltersService {
  private readonly logger = new Logger(UpdateSheltersService.name);

  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly getService: GetSheltersService,
    private readonly teamsService: ShelterTeamsService,
    private readonly mediaService: ShelterMediaService,
    private readonly routeService: ShelterRouteService,
  ) {}

  async execute(
    id: string,
    dto: UpdateShelterDto,
    actor: ShelterAccessContext,
    files: UploadedFilesDict = {},
  ): Promise<ShelterEntity> {
    assertCanManageShelters(actor);

    const current = await this.getService.findEntityOrFail(id, actor);
    const currentTeamsQuantity = current.teamsQuantity ?? 0;

    await this.sheltersRepository.updateShelter(id, dto);

    if (dto.teamsQuantity !== currentTeamsQuantity || dto.teams) {
      await this.teamsService.syncForShelter(
        id,
        dto.teamsQuantity,
        dto.teams,
        currentTeamsQuantity,
      );
    }

    const imageUrl = await this.applyMedia(id, dto.mediaItem, files);

    if (dto.name || dto.description !== undefined || dto.address || imageUrl) {
      const updated = await this.getService.findEntityOrFail(id, actor);
      await this.routeService.syncWithShelter(
        updated,
        {
          name: dto.name,
          description: dto.description,
          addressChanged: Boolean(dto.address),
        },
        imageUrl,
      );
    }

    this.logger.log(`Shelter updated: ${id}`);

    const fresh = await this.getService.findEntityOrFail(id, actor);
    await this.mediaService.attachAll([fresh]);
    return fresh;
  }

  /**
   * Atualiza a imagem do abrigo a partir do PATCH dedicado, montando o payload
   * de mídia a partir do arquivo enviado quando ele não vem descrito.
   */
  async updateMedia(
    id: string,
    media: ShelterMediaInput,
    actor: ShelterAccessContext,
    files: UploadedFilesDict,
  ): Promise<ShelterEntity> {
    assertCanManageShelters(actor);
    await this.getService.findEntityOrFail(id, actor);

    const fileKeys = Object.keys(files);
    const hasFile = fileKeys.length > 0;

    const imageUrl = await this.mediaService.upsertMainPhoto(
      id,
      {
        title: media.title,
        description: media.description,
        uploadType:
          media.uploadType ?? (hasFile ? UploadType.UPLOAD : UploadType.LINK),
        url: media.url,
        isLocalFile: hasFile,
        fieldKey: hasFile ? fileKeys[0] : media.fieldKey,
      },
      files,
    );

    const updated = await this.getService.findEntityOrFail(id, actor);
    await this.routeService.syncWithShelter(updated, {}, imageUrl);

    this.logger.log(`Shelter media updated: ${id}`);
    await this.mediaService.attachAll([updated]);
    return updated;
  }

  /**
   * A mídia só é regravada quando o payload de fato traz uma fonte nova: um
   * arquivo enviado ou uma URL. Sem isso, um update de nome reenviaria a mesma
   * imagem e apagaria o arquivo anterior do bucket.
   */
  private async applyMedia(
    shelterId: string,
    media: UpdateShelterDto["mediaItem"],
    files: UploadedFilesDict,
  ): Promise<string | undefined> {
    if (!media) return undefined;

    const fileKeys = Object.keys(files);
    const hasFile = fileKeys.length > 0;
    const hasUrl = Boolean(media.url);
    if (!hasFile && !hasUrl) return undefined;

    const input: ShelterMediaInput = {
      ...media,
      fieldKey: media.fieldKey ?? (hasFile ? fileKeys[0] : undefined),
      isLocalFile: hasFile ? true : media.isLocalFile,
      uploadType: hasFile ? UploadType.UPLOAD : media.uploadType,
    };

    return this.mediaService.upsertMainPhoto(shelterId, input, files);
  }
}
