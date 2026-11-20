import { IsEnum, IsOptional, IsString } from "class-validator";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";

export class QueryVisitMaterialsPageDto {
  @IsOptional()
  @IsEnum(TestamentType)
  testament?: TestamentType;

  /** Só as páginas que têm seção desta categoria (faixa etária). */
  @IsOptional()
  @IsEnum(VisitMaterialCategory, {
    message: 'O filtro "category" deve ser BABY, CHILD, TEEN ou ADULT.',
  })
  category?: VisitMaterialCategory;

  @IsOptional()
  @IsString()
  searchString?: string;
}
