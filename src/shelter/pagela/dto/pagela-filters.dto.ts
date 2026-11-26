import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { SortOrder } from "src/shared/enums/sort-order.enum";

/** Campos aceitos em `sortBy` da listagem paginada de pagelas. */
export enum PagelaSortBy {
  PERIOD = "period",
  REFERENCE_DATE = "referenceDate",
  MEMBER = "member",
}

const BooleanQuery = () => {
  return Transform(
    ({ key, obj }: { key: string; obj: Record<string, unknown> }) => {
      const originalValue = obj[key];

      if (
        originalValue === undefined ||
        originalValue === null ||
        originalValue === ""
      )
        return undefined;

      if (typeof originalValue === "boolean") return originalValue;

      if (
        typeof originalValue !== "string" &&
        typeof originalValue !== "number"
      )
        return undefined;

      const s = String(originalValue).trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(s)) return true;
      if (["false", "0", "no", "n"].includes(s)) return false;

      return undefined;
    },
  );
};

export class PagelaFiltersDto {
  @IsOptional()
  @IsUUID()
  shelteredId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visit?: number;

  @IsOptional()
  @BooleanQuery()
  @IsBoolean()
  present?: boolean;

  @IsOptional()
  @IsString()
  searchString?: string;

  /** Início do intervalo da data de referência (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: "referenceFrom deve ser AAAA-MM-DD" },
  )
  referenceFrom?: string;

  /** Fim do intervalo da data de referência (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: "referenceTo deve ser AAAA-MM-DD" },
  )
  referenceTo?: string;

  /** Sem `sortBy` a ordem continua sendo ano e visita, do mais novo para o mais antigo. */
  @IsOptional()
  @IsEnum(PagelaSortBy, {
    message: "sortBy deve ser period, referenceDate ou member",
  })
  sortBy?: PagelaSortBy;

  @IsOptional()
  @IsEnum(SortOrder, { message: "order deve ser ASC ou DESC" })
  order?: SortOrder;
}
