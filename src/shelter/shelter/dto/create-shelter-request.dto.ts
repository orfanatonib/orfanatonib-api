import { IsOptional, IsString, IsNumber, IsObject, IsArray } from 'class-validator';
import {
  CreateShelterDto,
  TeamInputDto,
  AddressInputDto,
  MediaItemInputDto
} from './create-shelter.dto';

export class CreateShelterRequestDto {
  @IsOptional()
  @IsString()
  shelterData?: string | CreateShelterDto;

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

