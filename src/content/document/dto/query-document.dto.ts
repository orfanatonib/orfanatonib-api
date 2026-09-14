import { IsOptional, IsString } from "class-validator";

export class QueryDocumentDto {
  @IsOptional()
  @IsString({ message: "search deve ser uma string" })
  search?: string;
}
