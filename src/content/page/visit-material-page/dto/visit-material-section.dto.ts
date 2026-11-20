import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";

/** Seção de uma categoria na criação/edição da página: título/descrição próprios e as quatro listas de mídia. */
export class VisitMaterialSectionInputDto extends VisitMaterialMediaInputDto {
  @IsOptional()
  @IsUUID("4", { message: 'O campo "id" da seção deve ser um UUID válido.' })
  id?: string;

  @IsEnum(VisitMaterialCategory, {
    message: 'O campo "category" da seção deve ser BABY, CHILD, TEEN ou ADULT.',
  })
  category: VisitMaterialCategory;

  @IsOptional()
  @IsString({ message: 'O campo "title" da seção deve ser uma string.' })
  @MaxLength(180, {
    message: 'O campo "title" da seção aceita até 180 caracteres.',
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'O campo "description" da seção deve ser uma string.' })
  description?: string;
}
