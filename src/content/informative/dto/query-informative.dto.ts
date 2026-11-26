import { IsEnum, IsOptional } from "class-validator";
import { PublicFilterQueryDto } from "src/shared/list-query/list-query.dto";
import { InformativeSortBy } from "../enums/informative-sort-by.enum";

export class QueryInformativeDto extends PublicFilterQueryDto {
  @IsOptional()
  @IsEnum(InformativeSortBy, { message: "sortBy deve ser createdAt ou title" })
  sortBy?: InformativeSortBy;
}
