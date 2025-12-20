import { IsOptional, IsString, IsNumber, IsObject, IsArray } from 'class-validator';
import { 
  CreateShelterDto, 
  TeamInputDto, 
  AddressInputDto, 
  MediaItemInputDto 
} from './create-shelter.dto';

/**
 * DTO para receber dados de criação de abrigo via form-data ou JSON
 * 
 * Pode receber:
 * - shelterData: string JSON (quando vem como form-data)
 * - Campos diretos do CreateShelterDto (quando vem como JSON puro)
 * 
 * A validação e transformação são feitas no service
 */
export class CreateShelterRequestDto {
  /**
   * Quando vem como form-data, os dados do shelter vêm como string JSON neste campo
   */
  @IsOptional()
  @IsString()
  shelterData?: string | CreateShelterDto;

  /**
   * Campos diretos do CreateShelterDto (usado quando vem como JSON puro)
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
  address?: AddressInputDto | string;

  @IsOptional()
  @IsArray()
  teams?: TeamInputDto[] | string;

  @IsOptional()
  @IsObject()
  mediaItem?: MediaItemInputDto | string;
}

