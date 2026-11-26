import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { SortOrder } from "../enums/sort-order.enum";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";

export const LIST_QUERY_MAX_LIMIT = 100;
export const LIST_QUERY_DEFAULT_LIMIT = 12;
export const LIST_QUERY_SEARCH_MAX = 120;

/**
 * Filtros comuns das listagens administrativas (meditações, documentos, informativos e
 * páginas de fotos/vídeos/ideias). Cada módulo estende e acrescenta o seu `sortBy`
 * e os filtros próprios.
 *
 * Sem `page` a resposta continua sendo o array de sempre (consumidores públicos não mudam);
 * com `page` vira `{ data, meta }` paginado no banco.
 */
export class ListQueryDto {
  @IsOptional()
  @IsString({ message: "search deve ser uma string" })
  @MaxLength(LIST_QUERY_SEARCH_MAX, {
    message: `search aceita no máximo ${LIST_QUERY_SEARCH_MAX} caracteres`,
  })
  search?: string;

  /** Início do intervalo de criação (inclusivo), `AAAA-MM-DD`, no fuso local do servidor. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "createdFrom deve ser AAAA-MM-DD" })
  createdFrom?: string;

  /** Fim do intervalo de criação (inclusivo, dia inteiro), `AAAA-MM-DD`, no fuso local do servidor. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "createdTo deve ser AAAA-MM-DD" })
  createdTo?: string;

  @IsOptional()
  @IsEnum(SortOrder, { message: "order deve ser ASC ou DESC" })
  order?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page deve ser um inteiro" })
  @Min(1, { message: "page deve ser maior ou igual a 1" })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit deve ser um inteiro" })
  @Min(1, { message: "limit deve ser maior ou igual a 1" })
  @Max(LIST_QUERY_MAX_LIMIT, {
    message: `limit aceita no máximo ${LIST_QUERY_MAX_LIMIT}`,
  })
  limit?: number;
}

/** Filtro `public=true|false` (texto estrito: `"talvez"` é 400, não `true`). */
export class PublicFilterQueryDto extends ListQueryDto {
  @IsOptional()
  @StrictBoolean()
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean({ message: "public deve ser true ou false" })
  public?: boolean;
}
