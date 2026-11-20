import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
} from "class-validator";

import { ContentAudience } from "../enums/content-audience.enum";

/** Públicos (abas) a enviar para revisão. Sem a lista, todos são enviados. */
export class SubmitPackageReviewDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ContentAudience, { each: true })
  audiences?: ContentAudience[];
}
