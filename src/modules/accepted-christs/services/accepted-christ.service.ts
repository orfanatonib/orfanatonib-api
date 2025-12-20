import { Injectable, NotFoundException } from '@nestjs/common';
import { AcceptedChristRepository } from '../repositories/accepted-christ.repository';
import { CreateAcceptedChristDto } from '../dtos/create-accepted-christ.dto';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcceptedChristEntity } from '../entities/accepted-christ.entity';

@Injectable()
export class AcceptedChristService {
  constructor(
    private readonly acceptedChristRepository: AcceptedChristRepository,

    @InjectRepository(ShelteredEntity)
    private readonly shelteredRepository: Repository<ShelteredEntity>,
  ) {}

  async create(dto: CreateAcceptedChristDto): Promise<AcceptedChristEntity> {
    const sheltered = await this.shelteredRepository.findOneByOrFail({ id: dto.shelteredId });

    const accepted = this.acceptedChristRepository.create({
      decision: dto.decision ?? null,
      sheltered,
      notes: dto.notes ?? null,
    });

    return await this.acceptedChristRepository.save(accepted);
  }
}
