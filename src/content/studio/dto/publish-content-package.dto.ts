import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";

import { CONTENT_PUBLICATION_IDEMPOTENCY_KEY_MAX_LENGTH } from "../constants/content-publication.constants";

export class PublishContentPackageDto {
  @IsString({ message: 'O campo "idempotencyKey" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "idempotencyKey" é obrigatório.' })
  @MaxLength(CONTENT_PUBLICATION_IDEMPOTENCY_KEY_MAX_LENGTH, {
    message: 'O campo "idempotencyKey" deve ter no máximo 191 caracteres.',
  })
  idempotencyKey: string;

  @IsOptional()
  @IsEnum(TestamentType, {
    message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.',
  })
  testament?: TestamentType;
}
