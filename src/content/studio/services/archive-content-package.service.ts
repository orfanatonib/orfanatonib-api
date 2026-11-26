import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class ArchiveContentPackageService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(packageId: string): Promise<ContentPackageEntity> {
    return this.packages.archivePackage(packageId);
  }
}
