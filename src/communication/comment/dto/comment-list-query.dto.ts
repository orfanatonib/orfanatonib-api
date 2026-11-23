import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { CommentSortBy } from "../enums/comment-sort-by.enum";

/** Fila de moderação de depoimentos (admin). Sem `page` a resposta é o array legado. */
export class CommentListQueryDto extends ListQueryDto {
  /** `true` = publicados; `false` = ainda aguardando o admin. */
  @IsOptional()
  @StrictBoolean()
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean({ message: "published deve ser true ou false" })
  published?: boolean;

  /** Trecho do nome do abrigo informado no depoimento. */
  @IsOptional()
  @IsString({ message: "shelter deve ser uma string" })
  @MaxLength(100, { message: "shelter aceita no máximo 100 caracteres" })
  shelter?: string;

  @IsOptional()
  @IsEnum(CommentSortBy, {
    message: "sortBy deve ser createdAt, name ou shelter",
  })
  sortBy?: CommentSortBy;
}
