import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsString,
  IsIn,
} from "class-validator";
import {
  LIST_QUERY_MAX_LIMIT,
  LIST_QUERY_SEARCH_MAX,
} from "src/shared/list-query/list-query.dto";

export class QuerySheltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIST_QUERY_MAX_LIMIT, {
    message: `limit aceita no máximo ${LIST_QUERY_MAX_LIMIT}`,
  })
  limit?: number = 10;

  @IsOptional()
  @IsIn(["name", "createdAt", "updatedAt", "city", "state"])
  sort?: "name" | "createdAt" | "updatedAt" | "city" | "state" = "name";

  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  order?: "ASC" | "DESC" | "asc" | "desc" = "ASC";

  @IsOptional()
  @IsString()
  @MaxLength(LIST_QUERY_SEARCH_MAX)
  searchString?: string;

  @IsOptional()
  @IsString()
  shelterName?: string;

  /** Trecho da cidade do endereço (LIKE no banco). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  /** Trecho do estado (UF) do endereço (LIKE no banco). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  /** Início do intervalo de criação (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: "createdFrom deve ser AAAA-MM-DD" },
  )
  createdFrom?: string;

  /** Fim do intervalo de criação (inclusivo, dia inteiro), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "createdTo deve ser AAAA-MM-DD" })
  createdTo?: string;
}
