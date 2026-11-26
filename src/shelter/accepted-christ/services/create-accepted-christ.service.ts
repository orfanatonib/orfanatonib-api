import { Injectable, NotFoundException } from "@nestjs/common";
import { AcceptedChristRepository } from "../repositories/accepted-christ.repository";
import { CreateAcceptedChristDto } from "../dto/create-accepted-christ.dto";
import { AcceptedChristResponseDto } from "../dto/accepted-christ-response.dto";
import { PagelaAccessService } from "src/shelter/pagela/services/pagela-access.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

@Injectable()
export class CreateAcceptedChristService {
  constructor(
    private readonly acceptedChristRepository: AcceptedChristRepository,
    private readonly access: PagelaAccessService,
  ) {}

  /**
   * Entrada HTTP: o ator precisa alcançar o abrigo do acolhido (mesma regra de /sheltered e
   * /pagelas). Fora do escopo responde 404, igual a acolhido inexistente: não revela o UUID.
   */
  async createAs(
    actor: ShelterAccessContext,
    dto: CreateAcceptedChristDto,
  ): Promise<AcceptedChristResponseDto> {
    await this.access.assertCanAccessSheltered(dto.shelteredId, actor);
    return this.create(dto);
  }

  async create(
    dto: CreateAcceptedChristDto,
  ): Promise<AcceptedChristResponseDto> {
    const sheltered = await this.acceptedChristRepository.findShelteredById(
      dto.shelteredId,
    );
    if (!sheltered) {
      throw new NotFoundException(
        `Sheltered with id ${dto.shelteredId} not found.`,
      );
    }

    const accepted = this.acceptedChristRepository.create({
      decision: dto.decision ?? null,
      sheltered,
      notes: dto.notes ?? null,
    });

    const saved = await this.acceptedChristRepository.save(accepted);
    return AcceptedChristResponseDto.fromEntity(saved);
  }
}
