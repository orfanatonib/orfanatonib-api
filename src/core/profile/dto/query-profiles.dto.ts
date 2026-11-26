import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDateString,
  MaxLength,
} from "class-validator";
import { LIST_QUERY_SEARCH_MAX } from "src/shared/list-query/list-query.dto";
import { Type } from "class-transformer";

export class QueryProfilesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  q?: string;

  /** Mesmo que `q` (nome ou e-mail), com o nome que as demais listagens administrativas usam. */
  @IsOptional()
  @IsString()
  @MaxLength(LIST_QUERY_SEARCH_MAX, {
    message: `search aceita no máximo ${LIST_QUERY_SEARCH_MAX} caracteres`,
  })
  search?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(["admin", "member", "leader"])
  role?: string;

  @IsOptional()
  @IsString()
  loveLanguages?: string;

  @IsOptional()
  @IsString()
  temperaments?: string;

  @IsOptional()
  @IsString()
  favoriteColor?: string;

  /** Gênero cadastrado nos dados pessoais (igualdade exata, ex.: `Feminino`). */
  @IsOptional()
  @IsString()
  gender?: string;

  /** Mês de aniversário (1 a 12), pela data de nascimento dos dados pessoais. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;

  /** Início do intervalo de cadastro (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: "createdFrom deve ser AAAA-MM-DD" },
  )
  createdFrom?: string;

  /** Fim do intervalo de cadastro (inclusivo, dia inteiro), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "createdTo deve ser AAAA-MM-DD" })
  createdTo?: string;

  @IsOptional()
  @IsString()
  @IsIn(["name", "email", "createdAt", "birthDate"])
  sortBy?: string = "name";

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  order?: "ASC" | "DESC" = "ASC";
}
