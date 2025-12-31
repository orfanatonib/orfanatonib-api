import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';

@Entity('addresses')
export class AddressEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  @IsOptional()
  street?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  @IsOptional()
  number?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  @IsOptional()
  district?: string | null;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  city: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  state: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  @IsOptional()
  postalCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  @IsOptional()
  complement?: string;
}
