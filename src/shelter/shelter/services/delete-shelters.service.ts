import { Injectable, Logger } from "@nestjs/common";
import { SheltersRepository } from "../repositories/shelters.repository";
import { assertCanManageShelters } from "../utils/shelter-access.util";
import { ShelterAccessContext } from "../types";
import { SHELTER_MESSAGES } from "../constants";
import { GetSheltersService } from "./get-shelters.service";
import { ShelterMediaService } from "./shelter-media.service";

@Injectable()
export class DeleteSheltersService {
  private readonly logger = new Logger(DeleteSheltersService.name);

  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly getService: GetSheltersService,
    private readonly mediaService: ShelterMediaService,
  ) {}

  async execute(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<{ message: string }> {
    assertCanManageShelters(actor);
    // Resolve dentro do escopo do ator: abrigo que ele não enxerga é 404.
    await this.getService.findEntityOrFail(id, actor);

    const removedMedia = await this.mediaService.removeAllForShelter(id);
    if (removedMedia > 0) {
      this.logger.log(`Deleted ${removedMedia} media items for shelter ${id}`);
    }

    // A rota sai dentro da transação do repositório: `shelters.routeId` é
    // ON DELETE CASCADE, então removê-la aqui apagaria o abrigo antes da hora.
    await this.sheltersRepository.deleteById(id);

    this.logger.log(`Shelter deleted: ${id}`);
    return { message: SHELTER_MESSAGES.DELETED };
  }
}
