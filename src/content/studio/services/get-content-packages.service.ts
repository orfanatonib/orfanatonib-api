import { BadRequestException, Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";

import { QueryContentPackagesDto } from "../dto/query-content-packages.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class GetContentPackagesService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async findAll(query: QueryContentPackagesDto): Promise<{
    data: ContentPackageEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (
      query.startDate &&
      query.endDate &&
      new Date(query.startDate).getTime() > new Date(query.endDate).getTime()
    ) {
      throw new BadRequestException(
        "A data inicial deve ser anterior ou igual à data final",
      );
    }
    return this.packages.findAllPaginated(query);
  }

  async findOne(id: string): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.findByIdWithGraph(id);

    if (!contentPackage) {
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado");
    }

    return contentPackage;
  }
}
