import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import { CreatePagelaDto } from "../dto/create-pagela.dto";
import { PagelaResponseDto } from "../dto/pagela-response.dto";
import { getISOWeekYear } from "../week.util";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { PagelaAccessService } from "./pagela-access.service";

@Injectable()
export class CreatePagelaService {
  constructor(
    private readonly repo: PagelasRepository,
    private readonly access: PagelaAccessService,
  ) {}

  async execute(dto: CreatePagelaDto): Promise<PagelaResponseDto> {
    const visit = dto.visit;
    const year = dto.year ?? getISOWeekYear(dto.referenceDate).year;

    const created = await this.repo.createOne({
      shelteredId: dto.shelteredId,
      memberProfileId: dto.memberProfileId,
      referenceDate: dto.referenceDate,
      year,
      visit,
      present: dto.present,
      notes: dto.notes ?? null,
    });

    return PagelaResponseDto.fromEntity(created);
  }

  /** Entrada HTTP: o ator precisa alcançar o abrigo do acolhido. */
  async executeAs(
    actor: ShelterAccessContext,
    dto: CreatePagelaDto,
  ): Promise<PagelaResponseDto> {
    await this.access.assertCanAccessSheltered(dto.shelteredId, actor);
    return this.execute(dto);
  }
}
