import { Injectable, Logger } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AddressEntity } from "../entities/address.entity/address.entity";
import { CreateAddressService } from "./create-address.service";
import { GetAddressService } from "./get-address.service";
import { UpdateAddressService } from "./update-address.service";

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    private readonly createAddressService: CreateAddressService,
    private readonly getAddressService: GetAddressService,
    private readonly updateAddressService: UpdateAddressService,
  ) {}

  create(partial: Partial<AddressEntity>, _txId?: string): AddressEntity {
    return this.createAddressService.create(partial);
  }

  merge(target: AddressEntity, partial: Partial<AddressEntity>, _txId?: string): AddressEntity {
    return this.updateAddressService.merge(target, partial);
  }

  async save(entity: AddressEntity, em?: EntityManager, _txId?: string): Promise<AddressEntity> {
    return this.createAddressService.save(entity, em);
  }

  async findById(id: string, em?: EntityManager, _txId?: string): Promise<AddressEntity | null> {
    return this.getAddressService.findById(id, em);
  }

  async update(id: string, partial: Partial<AddressEntity>, _txId?: string): Promise<AddressEntity> {
    return this.updateAddressService.update(id, partial);
  }
}
