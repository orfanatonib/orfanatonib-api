import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class SubmitPackageReviewService {
  constructor(private readonly packages: ContentReviewRepository) {}

  async execute(packageId: string): Promise<ContentPackageEntity> {
    return this.packages.submitPackageForReview(packageId);
  }
}
