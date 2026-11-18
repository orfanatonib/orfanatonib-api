import {
  IsOptional,
  IsUUID,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { Transform, Type } from "class-transformer";

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
}
