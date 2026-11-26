import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AddressEntity } from "../entities/address.entity/address.entity";
import { AddressesRepository } from "../repositories/addresses.repository";

@Injectable()
export class GetAddressService {
  constructor(private readonly repo: AddressesRepository) {}

  async findById(
    id: string,
    _em?: EntityManager,
  ): Promise<AddressEntity | null> {
    return this.repo.findById(id);
  }
}
