import { Injectable, NotFoundException } from "@nestjs/common";
import { AddressEntity } from "../entities/address.entity/address.entity";
import { AddressesRepository } from "../repositories/addresses.repository";

@Injectable()
export class UpdateAddressService {
  constructor(private readonly repo: AddressesRepository) {}

  merge(target: AddressEntity, partial: Partial<AddressEntity>): AddressEntity {
    return this.repo.merge(target, partial);
  }

  async update(
    id: string,
    partial: Partial<AddressEntity>,
  ): Promise<AddressEntity> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException("Address not found");
    }
    const merged = this.repo.merge(entity, partial);
    return this.repo.save(merged);
  }
}
