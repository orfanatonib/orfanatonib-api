import { IsOptional, IsString, IsNumber, IsObject, IsArray } from 'class-validator';
import { 
  UpdateShelterDto, 
  TeamInputDto, 
  AddressPatchDto, 
  MediaItemDto 
} from './update-shelter.dto';

/**
 * DTO para receber dados de atualização de abrigo via form-data ou JSON
 * 
 * Pode receber:
 * - shelterData: string JSON (quando vem como form-data)
 * - Campos diretos do UpdateShelterDto (quando vem como JSON puro)
 * 
 * A validação e transformação são feitas no service
 */
export class UpdateShelterRequestDto {
  /**
   * Quando vem como form-data, os dados do shelter vêm como string JSON neste campo
   */
  @IsOptional()
  @IsString()
  shelterData?: string | UpdateShelterDto;

  /**
   * Campos diretos do UpdateShelterDto (usado quando vem como JSON puro)
   */
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  teamsQuantity?: number;

  @IsOptional()
  @IsObject()
  address?: AddressPatchDto | string;

  @IsOptional()
  @IsArray()
  teams?: TeamInputDto[] | string;

  @IsOptional()
  @IsObject()
  mediaItem?: MediaItemDto | string;
}

