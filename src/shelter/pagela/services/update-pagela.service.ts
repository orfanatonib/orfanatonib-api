import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import { UpdatePagelaDto } from "../dto/update-pagela.dto";
import { PagelaResponseDto } from "../dto/pagela-response.dto";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { PagelaAccessService } from "./pagela-access.service";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";

@Injectable()
export class UpdatePagelaService {
  constructor(
    private readonly repo: PagelasRepository,
    private readonly access: PagelaAccessService,
  ) {}

  async execute(id: string, dto: UpdatePagelaDto): Promise<PagelaResponseDto> {
    const memberUpdate = dto.memberProfileId
      ? ({ id: dto.memberProfileId } as MemberProfileEntity)
      : undefined;

    const updated = await this.repo.updateOne(id, {
      member: memberUpdate,
      referenceDate: dto.referenceDate ?? undefined,
      year: dto.year ?? undefined,
      visit: dto.visit ?? undefined,
      present: dto.present ?? undefined,
      notes: dto.notes ?? undefined,
    });

    return PagelaResponseDto.fromEntity(updated);
  }

  async executeAs(
    actor: ShelterAccessContext,
    id: string,
    dto: UpdatePagelaDto,
  ): Promise<PagelaResponseDto> {
    await this.access.assertCanAccessPagela(id, actor);
    return this.execute(id, dto);
  }
}
