import { IsOptional, IsString } from "class-validator";

export class QueryInformativeDto {
  @IsOptional()
  @IsString({ message: "search deve ser uma string" })
  search?: string;
}
