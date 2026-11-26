import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { PublicFilterQueryDto } from "src/shared/list-query/list-query.dto";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialSortBy } from "../enums/visit-material-sort-by.enum";

/**
 * Filtros da listagem. `search` (título/subtítulo/descrição) é o nome comum das listagens
 * administrativas; `searchString` continua aceito por compatibilidade. `public` filtra pela rota.
 * Sem `page` a resposta continua sendo o array de sempre.
 */
export class QueryVisitMaterialsPageDto extends PublicFilterQueryDto {
  @IsOptional()
  @IsEnum(TestamentType)
  testament?: TestamentType;

  /** Só as páginas que têm seção desta categoria (faixa etária). */
  @IsOptional()
  @IsEnum(VisitMaterialCategory, {
    message: 'O filtro "category" deve ser BABY, CHILD, TEEN ou ADULT.',
  })
  category?: VisitMaterialCategory;

  /** Só a página marcada como material atual (`true`) ou só as demais (`false`). */
  @IsOptional()
  @StrictBoolean()
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean({ message: "currentWeek deve ser true ou false" })
  currentWeek?: boolean;

  @IsOptional()
  @IsString()
  searchString?: string;

  @IsOptional()
  @IsEnum(VisitMaterialSortBy, {
    message: "sortBy deve ser createdAt, title ou testament",
  })
  sortBy?: VisitMaterialSortBy;
}
