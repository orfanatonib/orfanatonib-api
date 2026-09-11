import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { GetSheltersService } from "src/shelter/shelter/services/get-shelters.service";
import { ShelteredAccessContext } from "../types";
import { SHELTERED_MESSAGES } from "../constants";

/**
 * Single place where the acolhido -> abrigo link is authorized, shared by the
 * create and update use cases.
 */
@Injectable()
export class ShelteredShelterAccessService {
  constructor(private readonly getSheltersService: GetSheltersService) {}

  /**
   * The shelter must exist AND be visible to the actor. A shelter outside the
   * actor scope is reported as missing so the API never leaks its existence.
   */
  async assertReachable(
    shelterId: string,
    actor: ShelteredAccessContext,
  ): Promise<void> {
    // `ShelteredAccessContext` e `ShelterAccessContext` descrevem o mesmo ator.
    const reachable = await this.getSheltersService.existsForActor(shelterId, actor);

    if (!reachable) {
      throw new ResourceNotFoundException(
        SHELTERED_MESSAGES.SHELTER_NOT_FOUND,
        {
          shelterId,
        },
      );
    }
  }
}
