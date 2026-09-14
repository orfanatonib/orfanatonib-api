import { IsOptional, IsString } from "class-validator";

export class QueryMeditationDto {
  @IsOptional()
  @IsString({ message: "search deve ser uma string" })
  search?: string;
}
