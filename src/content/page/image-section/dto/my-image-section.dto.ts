import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";

/** Resumo de uma publicação do próprio autor (status e motivo da reprovação). */
export class MyImageSectionDto {
  id: string;
  caption: string;
  reviewStatus: ImageSectionReviewStatus;
  /** Só preenchido quando `reviewStatus` é `rejected`. */
  rejectionReason: string | null;
  photoCount: number;
  videoCount: number;
  createdAt: Date;
  reviewedAt: Date | null;
}
