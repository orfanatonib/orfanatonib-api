import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AddressEntity } from "../entities/address.entity/address.entity";
import { AddressesRepository } from "../repositories/addresses.repository";

@Injectable()
export class CreateAddressService {
  constructor(private readonly repo: AddressesRepository) {}

  create(partial: Partial<AddressEntity>): AddressEntity {
    return this.repo.create(partial);
  }

  async save(entity: AddressEntity, _em?: EntityManager): Promise<AddressEntity> {
    return this.repo.save(entity);
  }
}
