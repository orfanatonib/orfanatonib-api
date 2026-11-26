import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import {
  IMAGE_SECTION_REVIEW_MESSAGES,
  REJECTION_REASON_MAX_LENGTH,
} from "../constants";

export class RejectImageSectionDto {
  /** O autor recebe este motivo (na tela e por e-mail). */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString({ message: IMAGE_SECTION_REVIEW_MESSAGES.REASON_REQUIRED })
  @Length(1, REJECTION_REASON_MAX_LENGTH, {
    message: `${IMAGE_SECTION_REVIEW_MESSAGES.REASON_REQUIRED} (até ${REJECTION_REASON_MAX_LENGTH} caracteres).`,
  })
  reason: string;
}
