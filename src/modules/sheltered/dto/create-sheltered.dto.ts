import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  IsUUID,
  ValidateNested,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString() street: string;
  @IsOptional() @IsString() number?: string;
  @IsString() district: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() postalCode: string;
  @IsOptional() @IsString() complement?: string;
}

export class CreateShelteredDto {
  @IsString() @Length(2, 255) name: string;
  @IsDateString() birthDate: string;

  @IsOptional() 
  @ValidateIf((o) => o.guardianName && o.guardianName.trim().length > 0)
  @IsString() 
  @Length(2, 255) 
  guardianName?: string;
  
  @IsIn(['M', 'F']) gender: string;
  
  @IsOptional() 
  @ValidateIf((o) => o.guardianPhone && o.guardianPhone.trim().length > 0)
  @IsString() 
  @Length(5, 32) 
  guardianPhone?: string;

  @IsOptional() @IsDateString() joinedAt?: string;

  @IsOptional() @IsUUID() shelterId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}