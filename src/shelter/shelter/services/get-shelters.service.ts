import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { SheltersRepository } from "../repositories/shelters.repository";
import { QuerySheltersDto } from "../dto/query-shelters.dto";
import {
  ShelterResponseDto,
  ShelterSimpleResponseDto,
} from "../dto/shelter.response.dto";
import { ShelterPaginatedResponseDto } from "../dto/shelter-paginated-response.dto";
import { ShelterSelectOptionDto } from "../dto/shelter-select-option.dto";
import { ShelterTeamSelectOptionDto } from "../dto/shelter-team-select-option.dto";
import { ShelterTeamsQuantityResponseDto } from "../dto/shelter-teams-quantity-response.dto";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import { toShelterDto, toShelterSimpleDto } from "../mappers/shelter.mapper";
import { assertCanManageShelters } from "../utils/shelter-access.util";
import { ShelterAccessContext } from "../types";
import {
  SHELTER_LIMIT_DEFAULT,
  SHELTER_MESSAGES,
  SHELTER_PAGE_DEFAULT,
} from "../constants";
import { ShelterMediaService } from "./shelter-media.service";

@Injectable()
export class GetSheltersService {
  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly mediaService: ShelterMediaService,
    private readonly featureFlagsService: GetFeatureFlagsService,
  ) {}

  /** O endereço do abrigo é exposto conforme a feature flag. */
  private showAddress(): Promise<boolean> {
    return this.featureFlagsService.isEnabled(FeatureFlagKeys.SHELTER_ADDRESS);
  }

  async findAllPaginated(
    query: QuerySheltersDto,
    actor: ShelterAccessContext,
  ): Promise<ShelterPaginatedResponseDto<ShelterResponseDto>> {
    assertCanManageShelters(actor);

    const page = query.page ?? SHELTER_PAGE_DEFAULT;
    const limit = query.limit ?? SHELTER_LIMIT_DEFAULT;

    const { items, total } = await this.sheltersRepository.findAllPaginated(
      query,
      actor,
    );
    await this.mediaService.attachShelterPhotos(items);
    const showAddress = await this.showAddress();

    return {
      items: items.map((shelter) => toShelterDto(shelter, showAddress)),
      total,
      page,
      limit,
      pageCount: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  async findAllSimple(
    actor: ShelterAccessContext,
  ): Promise<ShelterSimpleResponseDto[]> {
    const shelters = await this.sheltersRepository.findAllSimple(actor);
    await this.mediaService.attachAll(shelters);
    const showAddress = await this.showAddress();

    return shelters.map((shelter) => toShelterSimpleDto(shelter, showAddress));
  }

  async findOne(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<ShelterResponseDto> {
    const shelter = await this.findEntityOrFail(id, actor);
    await this.mediaService.attachAll([shelter]);

    return toShelterDto(shelter, await this.showAddress());
  }

  /** Lookup compartilhado com os casos de uso de escrita. */
  async findEntityOrFail(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<ShelterEntity> {
    const shelter = await this.sheltersRepository.findOneOrFailForResponse(
      id,
      actor,
    );
    if (!shelter) {
      throw new ResourceNotFoundException(SHELTER_MESSAGES.NOT_FOUND, { id });
    }
    return shelter;
  }

  /**
   * Contrato sem `Request` para outros módulos: responde se o abrigo existe E
   * está visível para o ator, sem expor o payload do abrigo.
   */
  async existsForActor(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<boolean> {
    const shelter = await this.sheltersRepository.findOneOrFailForResponse(
      id,
      actor,
    );
    return shelter !== null;
  }

  /**
   * Contrato sem `Request` para outros módulos: os abrigos que um líder
   * lidera. Evita que o módulo de líderes alcance o repositório daqui.
   */
  findShelterIdsForLeader(userId: string): Promise<string[]> {
    return this.sheltersRepository.findShelterIdsForLeader(userId);
  }

  async list(actor: ShelterAccessContext): Promise<ShelterSelectOptionDto[]> {
    return this.sheltersRepository.list(actor, await this.showAddress());
  }

  listTeamsForPublic(): Promise<ShelterTeamSelectOptionDto[]> {
    return this.sheltersRepository.listTeamsForPublic();
  }

  async getTeamsQuantity(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<ShelterTeamsQuantityResponseDto> {
    const shelter = await this.findEntityOrFail(id, actor);

    return { id: shelter.id, teamsQuantity: shelter.teamsQuantity ?? 0 };
  }
}
