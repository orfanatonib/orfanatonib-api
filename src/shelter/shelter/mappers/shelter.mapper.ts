import { plainToInstance } from "class-transformer";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import {
  ShelterResponseDto,
  ShelterSimpleResponseDto,
  ShelterWithLeaderStatusDto,
  TeamWithLeaderStatusDto,
} from "../dto/shelter.response.dto";

const toInstance = <TDto>(
  dtoClass: new () => TDto,
  entity: ShelterEntity,
): TDto => plainToInstance(dtoClass, entity, { excludeExtraneousValues: true });

/**
 * O endereço do abrigo fica atrás de uma feature flag: quando desligada, o
 * campo simplesmente não vai na resposta.
 */
const applyAddressVisibility = <TDto extends { address?: unknown }>(
  dto: TDto,
  showAddress: boolean,
): TDto => {
  if (!showAddress) dto.address = undefined;
  return dto;
};

export const toShelterDto = (
  entity: ShelterEntity,
  showAddress = true,
): ShelterResponseDto =>
  applyAddressVisibility(toInstance(ShelterResponseDto, entity), showAddress);

export const toShelterSimpleDto = (
  entity: ShelterEntity,
  showAddress = true,
): ShelterSimpleResponseDto =>
  applyAddressVisibility(
    toInstance(ShelterSimpleResponseDto, entity),
    showAddress,
  );

/**
 * Variante usada pelo líder: marca, em cada equipe, se ele é um dos líderes.
 */
export const toShelterWithLeaderStatusDto = (
  entity: ShelterEntity,
  leaderId: string,
  showAddress = true,
): ShelterWithLeaderStatusDto => {
  const dto = applyAddressVisibility(
    toInstance(ShelterWithLeaderStatusDto, entity),
    showAddress,
  );

  dto.teams = (entity.teams ?? []).map((team) => {
    const teamDto = plainToInstance(TeamWithLeaderStatusDto, team, {
      excludeExtraneousValues: true,
    });
    teamDto.isLeaderInTeam = (team.leaders ?? []).some(
      (leader) => leader.id === leaderId,
    );
    return teamDto;
  });

  return dto;
};
