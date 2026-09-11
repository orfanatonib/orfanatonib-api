import { Injectable, Logger } from "@nestjs/common";
import { AddressesService } from "src/shelter/address/addresses.service";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { CreateShelteredDto } from "../dto/create-sheltered.dto";
import { ShelteredResponseDto } from "../dto/sheltered-response.dto";
import { toShelteredResponseDto } from "../mappers/sheltered.mapper";
import { toDateOnly } from "../utils/sheltered-date.util";
import { buildShelterReference } from "../utils/sheltered-relation.util";
import { ShelteredAccessContext } from "../types";
import { GetShelteredService } from "./get-sheltered.service";
import { ShelteredShelterAccessService } from "./sheltered-shelter-access.service";

@Injectable()
export class CreateShelteredService {
  private readonly logger = new Logger(CreateShelteredService.name);

  constructor(
    private readonly shelteredRepository: ShelteredRepository,
    private readonly getShelteredService: GetShelteredService,
    private readonly shelterAccessService: ShelteredShelterAccessService,
    private readonly addressesService: AddressesService,
  ) {}

  async execute(
    dto: CreateShelteredDto,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredResponseDto> {
    if (dto.shelterId) {
      await this.shelterAccessService.assertReachable(dto.shelterId, actor);
    }

    const sheltered = this.shelteredRepository.create({
      name: dto.name,
      gender: dto.gender,
      guardianName: dto.guardianName,
      guardianPhone: dto.guardianPhone,
      birthDate: toDateOnly(dto.birthDate),
      joinedAt: toDateOnly(dto.joinedAt),
      shelter: dto.shelterId ? buildShelterReference(dto.shelterId) : null,
    });

    if (dto.address) {
      sheltered.address = this.addressesService.create(dto.address);
    }

    // Single write: the address cascades with the acolhido, so it stays atomic.
    const saved = await this.shelteredRepository.save(sheltered);
    this.logger.log(`Sheltered created: ${saved.id}`);

    return toShelteredResponseDto(
      await this.getShelteredService.findEntityOrFail(saved.id, actor),
    );
  }
}
