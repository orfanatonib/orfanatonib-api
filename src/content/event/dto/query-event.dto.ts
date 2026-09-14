import { IsOptional, IsString } from "class-validator";

export class QueryEventDto {
  @IsOptional()
  @IsString({ message: "search deve ser uma string" })
  search?: string;

  @IsOptional()
  @IsString({ message: "startDate deve ser uma string" })
  startDate?: string;

  @IsOptional()
  @IsString({ message: "endDate deve ser uma string" })
  endDate?: string;
}
