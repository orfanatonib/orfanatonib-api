import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class ResolveReviewCommentService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  execute(
    packageId: string,
    commentId: string,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    return this.packages.resolveReviewComment(packageId, commentId, reviewerId);
  }
}
