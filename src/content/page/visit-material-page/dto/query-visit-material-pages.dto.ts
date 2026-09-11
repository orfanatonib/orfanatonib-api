import { IsEnum, IsOptional, IsString } from "class-validator";
import { TestamentType } from "../enums/testament-type.enum";

export class QueryVisitMaterialsPageDto {
  @IsOptional()
  @IsEnum(TestamentType)
  testament?: TestamentType;

  @IsOptional()
  @IsString()
  searchString?: string;
}
