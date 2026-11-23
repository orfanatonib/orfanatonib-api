import { OmitType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";

export enum ShelterTeamsSortBy {
  SHELTER_NAME = "shelterName",
  TEAM_COUNT = "teamCount",
}

/**
 * Filtros de `GET /attendance/leader/teams/members` (tela "Lançar presença").
 * Sem nenhum deles a resposta é a hierarquia completa de sempre; com `page`, `{ data, meta }`
 * paginado por abrigo. `search` casa abrigo, "Equipe N", descrição e nome de membro.
 * Não há data de criação aqui: `createdFrom/createdTo` são recusados (400).
 */
export class ShelterTeamsQueryDto extends OmitType(ListQueryDto, [
  "createdFrom",
  "createdTo",
] as const) {
  @IsOptional()
  @IsUUID(undefined, { message: "shelterId deve ser um UUID" })
  shelterId?: string;

  @IsOptional()
  @IsEnum(ShelterTeamsSortBy, {
    message: "sortBy deve ser shelterName ou teamCount",
  })
  sortBy?: ShelterTeamsSortBy;
}

export const usesShelterTeamsFeatures = (
  query?: ShelterTeamsQueryDto,
): boolean =>
  !!query &&
  [
    query.search,
    query.shelterId,
    query.sortBy,
    query.order,
    query.page,
    query.limit,
  ].some((value) => value !== undefined);
