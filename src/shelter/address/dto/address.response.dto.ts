import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AddressResponseDto {
  @Expose()
  id: string;

  @Expose()
  street?: string | null;

  @Expose()
  number?: string;

  @Expose()
  district?: string | null;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  postalCode?: string | null;

  @Expose()
  complement?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
