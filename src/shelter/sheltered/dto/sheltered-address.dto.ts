import { IsOptional, IsString, IsUUID } from "class-validator";

/**
 * Address payload accepted when creating an acolhido.
 * `city` and `state` are the only columns the address table requires.
 */
export class CreateShelteredAddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  complement?: string;
}

/**
 * Address payload accepted on update, where every field is optional because
 * the caller may be patching a single line of an existing address.
 */
export class UpdateShelteredAddressDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  complement?: string;
}
