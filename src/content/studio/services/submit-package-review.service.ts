import { Injectable } from "@nestjs/common";

import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class SubmitPackageReviewService {
  constructor(private readonly packages: ContentReviewRepository) {}

  async execute(
    packageId: string,
    audiences?: readonly ContentAudience[],
  ): Promise<ContentPackageEntity> {
    return this.packages.submitPackageForReview(packageId, audiences);
  }
}
