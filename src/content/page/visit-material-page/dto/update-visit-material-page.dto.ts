import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";
import { VISIT_MATERIAL_NON_BLANK_PATTERN } from "../constants";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";

export class UpdateVisitMaterialsPageDto extends VisitMaterialMediaInputDto {
  @IsString({ message: 'O campo "id" da página deve ser uma string.' })
  @IsUUID("4", { message: 'O campo "id" da página deve ser um UUID válido.' })
  id: string;

  @IsString({ message: 'O campo "pageTitle" da página deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "pageTitle" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageTitle" não pode conter apenas espaços.',
  })
  pageTitle: string;

  @IsString({
    message: 'O campo "pageSubtitle" da página deve ser uma string.',
  })
  @IsNotEmpty({ message: 'O campo "pageSubtitle" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageSubtitle" não pode conter apenas espaços.',
  })
  pageSubtitle: string;

  @IsString({
    message: 'O campo "pageDescription" da página deve ser uma string.',
  })
  @IsNotEmpty({ message: 'O campo "pageDescription" é obrigatório.' })
  @Matches(VISIT_MATERIAL_NON_BLANK_PATTERN, {
    message: 'O campo "pageDescription" não pode conter apenas espaços.',
  })
  pageDescription: string;

  @IsBoolean({
    message: 'O campo "currentWeek" da página deve ser uma boolean.',
  })
  currentWeek: boolean;

  @IsOptional()
  @IsEnum(TestamentType, {
    message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.',
  })
  testament?: TestamentType;
}
