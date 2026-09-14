import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import { VISIT_MATERIAL_NON_BLANK_PATTERN } from "../constants";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";

export class CreateVisitMaterialsPageDto extends VisitMaterialMediaInputDto {
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
}
