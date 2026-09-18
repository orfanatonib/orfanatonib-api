import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import { CreatePagelaDto } from "../dto/create-pagela.dto";
import { PagelaResponseDto } from "../dto/pagela-response.dto";
import { getISOWeekYear } from "../week.util";

@Injectable()
export class CreatePagelaService {
  constructor(private readonly repo: PagelasRepository) {}

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
}
