import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class SubmitPackageReviewService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(packageId: string): Promise<ContentPackageEntity> {
    return this.packages.submitPackageForReview(packageId);
  }
}
