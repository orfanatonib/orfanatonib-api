import { Injectable, Logger } from "@nestjs/common";
import { SheltersRepository } from "../repositories/shelters.repository";
import { CreateShelterDto } from "../dto/create-shelter.dto";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import { assertCanManageShelters } from "../utils/shelter-access.util";
import { ShelterAccessContext, UploadedFilesDict } from "../types";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";
import { ShelterRouteService } from "./shelter-route.service";
import { ShelterTeamsService } from "./shelter-teams.service";

@Injectable()
export class CreateSheltersService {
  private readonly logger = new Logger(CreateSheltersService.name);

  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly getService: GetSheltersService,
    private readonly teamsService: ShelterTeamsService,
    private readonly mediaService: ShelterMediaService,
    private readonly routeService: ShelterRouteService,
  ) {}

  async execute(
    dto: CreateShelterDto,
    actor: ShelterAccessContext,
    files: UploadedFilesDict = {},
  ): Promise<ShelterEntity> {
    assertCanManageShelters(actor);

    // O abrigo e seu endereço são gravados juntos pelo repositório.
    const shelter = await this.sheltersRepository.createShelter(dto);

    await this.teamsService.createForShelter(
      shelter.id,
      dto.teamsQuantity,
      dto.teams,
    );

    const imageUrl = dto.mediaItem
      ? await this.mediaService.upsertMainPhoto(
          shelter.id,
          dto.mediaItem,
          files,
        )
      : "";

    // A rota nasce na mesma transação do vínculo com o abrigo.
    await this.sheltersRepository.runInTransaction(async (manager) => {
      shelter.route = await this.routeService.createForShelter(
        manager,
        shelter,
        dto.description,
        imageUrl,
      );
      await this.sheltersRepository.save(shelter, manager);
    });

    this.logger.log(`Shelter created: ${shelter.id}`);

    const fresh = await this.getService.findEntityOrFail(shelter.id, actor);
    await this.mediaService.attachAll([fresh]);
    return fresh;
  }
}
