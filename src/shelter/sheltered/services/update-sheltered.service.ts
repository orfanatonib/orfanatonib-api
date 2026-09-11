import { Injectable, Logger } from "@nestjs/common";
import { AddressesService } from "src/shelter/address/addresses.service";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { UpdateShelteredDto } from "../dto/update-sheltered.dto";
import { ShelteredResponseDto } from "../dto/sheltered-response.dto";
import { ShelteredEntity } from "../entities/sheltered.entity";
import { toShelteredResponseDto } from "../mappers/sheltered.mapper";
import { toDateOnly } from "../utils/sheltered-date.util";
import { buildShelterReference } from "../utils/sheltered-relation.util";
import { ShelteredAccessContext } from "../types";
import { GetShelteredService } from "./get-sheltered.service";
import { ShelteredShelterAccessService } from "./sheltered-shelter-access.service";

@Injectable()
export class UpdateShelteredService {
  private readonly logger = new Logger(UpdateShelteredService.name);

  constructor(
    private readonly shelteredRepository: ShelteredRepository,
    private readonly getShelteredService: GetShelteredService,
    private readonly shelterAccessService: ShelteredShelterAccessService,
    private readonly addressesService: AddressesService,
  ) {}

  async execute(
    id: string,
    dto: UpdateShelteredDto,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredResponseDto> {
    const entity = await this.getShelteredService.findEntityOrFail(id, actor);

    this.applyScalarChanges(entity, dto);
    await this.applyShelterChange(entity, dto, actor);
    this.applyAddressChange(entity, dto);

    // Single write: the address cascades with the acolhido, so it stays atomic.
    await this.shelteredRepository.save(entity);
    this.logger.log(`Sheltered updated: ${id}`);

    return toShelteredResponseDto(
      await this.getShelteredService.findEntityOrFail(id, actor),
    );
  }

  /**
   * Flips the active flag without touching any other column.
   */
  async updateStatus(
    id: string,
    active: boolean,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredResponseDto> {
    const entity = await this.getShelteredService.findEntityOrFail(id, actor);

    entity.active = active;
    await this.shelteredRepository.save(entity);
    this.logger.log(`Sheltered status updated: ${id}`);

    return toShelteredResponseDto(
      await this.getShelteredService.findEntityOrFail(id, actor),
    );
  }

  private applyScalarChanges(
    entity: ShelteredEntity,
    dto: UpdateShelteredDto,
  ): void {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.gender !== undefined) entity.gender = dto.gender;
    if (dto.guardianName !== undefined) entity.guardianName = dto.guardianName;
    if (dto.guardianPhone !== undefined)
      entity.guardianPhone = dto.guardianPhone;
    if (dto.birthDate !== undefined)
      entity.birthDate = toDateOnly(dto.birthDate);
    if (dto.joinedAt !== undefined) entity.joinedAt = toDateOnly(dto.joinedAt);
    if (dto.active !== undefined) entity.active = dto.active;
  }

  private async applyShelterChange(
    entity: ShelteredEntity,
    dto: UpdateShelteredDto,
    actor: ShelteredAccessContext,
  ): Promise<void> {
    if (dto.shelterId === undefined) return;

    if (dto.shelterId === null) {
      entity.shelter = null;
      return;
    }

    await this.shelterAccessService.assertReachable(dto.shelterId, actor);
    entity.shelter = buildShelterReference(dto.shelterId);
  }

  private applyAddressChange(
    entity: ShelteredEntity,
    dto: UpdateShelteredDto,
  ): void {
    if (dto.address === undefined) return;

    if (dto.address === null) {
      entity.address = null;
      return;
    }

    if (entity.address) {
      this.addressesService.merge(entity.address, dto.address);
      return;
    }

    entity.address = this.addressesService.create(dto.address);
  }
}
