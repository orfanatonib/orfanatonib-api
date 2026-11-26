import {
  CONTENT_PACKAGE_TRANSITIONS,
  CONTENT_STAGE_TRANSITIONS,
} from "../constants/content-state-transitions";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

export function canTransitionContentPackage(
  current: ContentPackageStatus,
  next: ContentPackageStatus,
): boolean {
  return CONTENT_PACKAGE_TRANSITIONS[current].includes(next);
}

export function canTransitionContentStage(
  current: ContentStageStatus,
  next: ContentStageStatus,
): boolean {
  return CONTENT_STAGE_TRANSITIONS[current].includes(next);
}

export function isContentStagePublishable(status: ContentStageStatus): boolean {
  return status === ContentStageStatus.APPROVED;
}
