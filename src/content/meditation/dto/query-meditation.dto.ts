import { IsDateString, IsEnum, IsOptional } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { MeditationPeriod } from "../enums/meditation-period.enum";
import { MeditationSortBy } from "../enums/meditation-sort-by.enum";

export class QueryMeditationDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(MeditationPeriod, {
    message: "period deve ser current, upcoming ou past",
  })
  period?: MeditationPeriod;

  /** Início do intervalo sobre `startDate` (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "startFrom deve ser AAAA-MM-DD" })
  startFrom?: string;

  /** Fim do intervalo sobre `startDate` (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "startTo deve ser AAAA-MM-DD" })
  startTo?: string;

  @IsOptional()
  @IsEnum(MeditationSortBy, {
    message: "sortBy deve ser startDate, topic ou createdAt",
  })
  sortBy?: MeditationSortBy;
}
