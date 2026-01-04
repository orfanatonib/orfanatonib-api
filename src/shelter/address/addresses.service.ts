import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AddressEntity } from './entities/address.entity/address.entity';
import { AddressesRepository } from './repositories/addresses.repository';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly repo: AddressesRepository) {}

  private tag(txId?: string) { return txId ? `[${txId}] ` : ''; }

  create(partial: Partial<AddressEntity>, txId?: string) {
    return this.repo.create(partial);
  }

  merge(target: AddressEntity, partial: Partial<AddressEntity>, txId?: string) {
    return this.repo.merge(target, partial);
  }

  async save(entity: AddressEntity, em?: EntityManager, txId?: string) {
    const t0 = Date.now();
    const out = await this.repo.save(entity);
    return out;
  }

  async findById(id: string, em?: EntityManager, txId?: string) {
    const t0 = Date.now();
    const out = await this.repo.findById(id);
    return out;
  }

  async update(id: string, partial: Partial<AddressEntity>, txId?: string) {
    const t0 = Date.now();
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new Error('Address not found');
    }
    const merged = this.repo.merge(entity, partial);
    const out = await this.repo.save(merged);
    return out;
  }
}
