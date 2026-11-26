import { Injectable } from "@nestjs/common";

import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import { GetSheltersService } from "src/shelter/shelter/services/get-shelters.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { PagelasRepository } from "../pagelas.repository";

export const PAGELA_ACCESS_DENIED = "Acesso negado.";
export const PAGELA_NOT_FOUND = "Pagela não encontrada";
export const PAGELA_SHELTERED_NOT_FOUND = "Acolhido não encontrado";

/**
 * Escopo das pagelas: o ator precisa alcançar o abrigo do acolhido (mesma regra
 * de /sheltered). Fora do escopo responde 404 — nunca revela que o registro existe.
 */
@Injectable()
export class PagelaAccessService {
  constructor(
    private readonly repo: PagelasRepository,
    private readonly shelters: GetSheltersService,
  ) {}

  private assertHasRole(actor: ShelterAccessContext): void {
    if (actor.role === null)
      throw new AccessDeniedException(PAGELA_ACCESS_DENIED);
  }

  private async assertShelterReachable(
    shelterId: string | null,
    actor: ShelterAccessContext,
    notFound: string,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (!shelterId || !(await this.shelters.existsForActor(shelterId, actor))) {
      throw new ResourceNotFoundException(notFound);
    }
  }

  async assertCanAccessSheltered(
    shelteredId: string,
    actor: ShelterAccessContext,
  ): Promise<void> {
    this.assertHasRole(actor);
    if (actor.role === UserRole.ADMIN) return;
    const shelterId = await this.repo.findShelterIdOfSheltered(shelteredId);
    await this.assertShelterReachable(
      shelterId,
      actor,
      PAGELA_SHELTERED_NOT_FOUND,
    );
  }

  async assertCanAccessPagela(
    pagelaId: string,
    actor: ShelterAccessContext,
  ): Promise<void> {
    this.assertHasRole(actor);
    const scope = await this.repo.findScopeOfPagela(pagelaId);
    if (!scope) throw new ResourceNotFoundException(PAGELA_NOT_FOUND);
    await this.assertShelterReachable(scope.shelterId, actor, PAGELA_NOT_FOUND);
  }

  /**
   * Escopo das listagens: `undefined` = sem restrição (admin ou já filtrado por
   * acolhido autorizado); lista = abrigos permitidos (líder). Membro sem
   * `shelteredId` não lista (precisa escolher um acolhido do seu abrigo).
   */
  async resolveListScope(
    shelteredId: string | undefined,
    actor: ShelterAccessContext,
  ): Promise<readonly string[] | undefined> {
    this.assertHasRole(actor);
    if (actor.role === UserRole.ADMIN) return undefined;
    if (shelteredId) {
      await this.assertCanAccessSheltered(shelteredId, actor);
      return undefined;
    }
    if (actor.role === UserRole.LEADER && actor.userId) {
      return this.shelters.findShelterIdsForLeader(actor.userId);
    }
    throw new AccessDeniedException(PAGELA_ACCESS_DENIED);
  }
}
