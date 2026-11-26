import { AcceptedChristEntity } from "../entities/accepted-christ.entity";
import { ShelteredEntity } from "src/shelter/sheltered/entities/sheltered.entity";
import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AcceptedChristRepository extends Repository<AcceptedChristEntity> {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ShelteredEntity)
    private readonly shelteredRepo: Repository<ShelteredEntity>,
  ) {
    super(AcceptedChristEntity, dataSource.createEntityManager());
  }

  async findShelteredById(id: string): Promise<ShelteredEntity | null> {
    return this.shelteredRepo.findOneBy({ id });
  }
}
