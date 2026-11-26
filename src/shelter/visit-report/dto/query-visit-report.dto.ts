import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { VisitReportSortBy } from "../enums/visit-report-sort-by.enum";

/**
 * Filtros da listagem de relatórios de visita. Os ids (`scheduleId`, `teamId`, `shelterId`) são
 * escopos: nunca ampliam o que o líder enxerga. Sem `page` a resposta continua sendo o array de sempre.
 */
export class QueryVisitReportDto extends ListQueryDto {
  @IsOptional()
  @IsString({ message: "scheduleId deve ser uma string" })
  scheduleId?: string;

  @IsOptional()
  @IsString({ message: "teamId deve ser uma string" })
  teamId?: string;

  @IsOptional()
  @IsString({ message: "shelterId deve ser uma string" })
  shelterId?: string;

  /** Início do intervalo da data da visita (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "visitFrom deve ser AAAA-MM-DD" })
  visitFrom?: string;

  /** Fim do intervalo da data da visita (inclusivo), `AAAA-MM-DD`. */
  @IsOptional()
  @IsDateString({ strict: true }, { message: "visitTo deve ser AAAA-MM-DD" })
  visitTo?: string;

  @IsOptional()
  @IsEnum(VisitReportSortBy, {
    message:
      "sortBy deve ser createdAt, visitDate, visitNumber, shelter ou team",
  })
  sortBy?: VisitReportSortBy;
}
