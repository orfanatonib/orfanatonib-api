import {
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { VISIT_MATERIAL_NON_BLANK_PATTERN } from "../constants";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";
import { VisitMaterialSectionInputDto } from "./visit-material-section.dto";

export class CreateVisitMaterialsPageDto extends VisitMaterialMediaInputDto {
  @IsOptional()
  @IsUUID()
  sourceLessonId?: string;

  @IsString({ message: 'O campo "pageTitle" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "pageTitle" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageTitle" não pode conter apenas espaços.',
  })
  pageTitle: string;

  @IsString({ message: 'O campo "pageSubtitle" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "pageSubtitle" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageSubtitle" não pode conter apenas espaços.',
  })
  pageSubtitle: string;

  @IsString({ message: 'O campo "pageDescription" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "pageDescription" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageDescription" não pode conter apenas espaços.',
  })
  pageDescription: string;

  @IsOptional()
  @IsEnum(TestamentType, {
    message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.',
  })
  testament?: TestamentType;

  /**
   * Seções por categoria (uma por faixa etária). Omitido no PATCH = não mexe nas seções;
   * enviado = vira a lista completa (as que faltarem são removidas).
   */
  @IsOptional()
  @IsArray({ message: 'O campo "sections" deve ser um array.' })
  @ArrayMaxSize(4, {
    message: "Uma página aceita no máximo 4 seções (uma por categoria).",
  })
  @ValidateNested({ each: true })
  @Type(() => VisitMaterialSectionInputDto)
  sections?: VisitMaterialSectionInputDto[];
}
