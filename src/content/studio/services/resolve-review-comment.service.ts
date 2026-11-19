import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class ResolveReviewCommentService {
  constructor(private readonly packages: ContentReviewRepository) {}

  execute(
    packageId: string,
    commentId: string,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    return this.packages.resolveReviewComment(packageId, commentId, reviewerId);
  }
}
