import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

export const CONTENT_PACKAGE_TRANSITIONS: Readonly<
  Record<ContentPackageStatus, readonly ContentPackageStatus[]>
> = {
  [ContentPackageStatus.DRAFT]: [
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.IN_PROGRESS]: [
    ContentPackageStatus.PACKAGE_READY,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.PACKAGE_READY]: [
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.IN_REVIEW]: [
    ContentPackageStatus.CHANGES_REQUESTED,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.CHANGES_REQUESTED]: [
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.READY_FOR_PUBLICATION]: [
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.PUBLISHING]: [
    ContentPackageStatus.PUBLISHED,
    ContentPackageStatus.READY_FOR_PUBLICATION,
  ],
  [ContentPackageStatus.PUBLISHED]: [ContentPackageStatus.ARCHIVED],
  [ContentPackageStatus.ARCHIVED]: [],
};

export const CONTENT_STAGE_TRANSITIONS: Readonly<
  Record<ContentStageStatus, readonly ContentStageStatus[]>
> = {
  [ContentStageStatus.NOT_STARTED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
    ContentStageStatus.NOT_REQUIRED,
  ],
  [ContentStageStatus.GENERATING]: [
    ContentStageStatus.DRAFT,
    ContentStageStatus.FAILED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.DRAFT]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
    ContentStageStatus.PRODUCER_APPROVED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.PRODUCER_APPROVED]: [
    ContentStageStatus.IN_REVIEW,
    ContentStageStatus.DRAFT,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.IN_REVIEW]: [
    ContentStageStatus.APPROVED,
    ContentStageStatus.CHANGES_REQUESTED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.APPROVED]: [
    ContentStageStatus.DRAFT,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.FAILED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.STALE]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.CHANGES_REQUESTED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.NOT_REQUIRED]: [],
};
