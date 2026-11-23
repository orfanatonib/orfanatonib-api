import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";

export enum ScheduleSortBy {
  EVENT_DATE = "eventDate",
  SHELTER_NAME = "shelterName",
  VISIT_NUMBER = "visitNumber",
  CREATED_AT = "createdAt",
}

export enum ScheduleKind {
  VISIT = "visit",
  MEETING = "meeting",
}

/**
 * Filtros da listagem de agendamentos. Sem nenhum deles a rota devolve o array legado
 * (visita crescente); com qualquer um — ou com `page` — o banco filtra, ordena e recorta.
 * `createdFrom/createdTo` filtram a criação; `eventFrom/eventTo`, a data do evento
 * (a da visita ou, se não houver, a da reunião).
 */
export class QueryShelterScheduleDto extends ListQueryDto {
  /** Legado: estreita ao que o ator já pode ler. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  teamId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  shelterId?: string;

  /** `visit` = tem data de visita; `meeting` = tem data de reunião. */
  @IsOptional()
  @IsEnum(ScheduleKind, { message: "kind deve ser visit ou meeting" })
  kind?: ScheduleKind;

  @IsOptional()
  @IsDateString({ strict: true }, { message: "eventFrom deve ser AAAA-MM-DD" })
  eventFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true }, { message: "eventTo deve ser AAAA-MM-DD" })
  eventTo?: string;

  @IsOptional()
  @IsEnum(ScheduleSortBy, {
    message: "sortBy deve ser eventDate, shelterName, visitNumber ou createdAt",
  })
  sortBy?: ScheduleSortBy;
}

/** `true` quando o pedido usa algo além do legado (`teamId` sozinho continua legado). */
export const usesListFeatures = (query?: QueryShelterScheduleDto): boolean =>
  !!query &&
  [
    query.search,
    query.shelterId,
    query.kind,
    query.eventFrom,
    query.eventTo,
    query.createdFrom,
    query.createdTo,
    query.sortBy,
    query.order,
    query.page,
    query.limit,
  ].some((value) => value !== undefined);
