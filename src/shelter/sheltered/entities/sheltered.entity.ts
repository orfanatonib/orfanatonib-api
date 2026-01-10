import { BaseEntity } from 'src/shared/entity/base.entity';
import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AddressEntity } from 'src/shelter/address/entities/address.entity/address.entity';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { PagelaEntity } from 'src/shelter/pagela/entities/pagela.entity';
import { AcceptedChristEntity } from 'src/shelter/accepted-christ/entities/accepted-christ.entity';

@Entity('sheltered')
export class ShelteredEntity extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  guardianName?: string | null;

  @Column({ type: 'char', length: 1 })
  gender: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  guardianPhone?: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ type: 'date', nullable: true })
  joinedAt?: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToOne(() => ShelterEntity, (shelter) => shelter.sheltered, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'shelter_id' })
  shelter: ShelterEntity | null;

  @OneToOne(() => AddressEntity, {
    cascade: true,
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'address_id' })
  address?: AddressEntity | null;

  @OneToMany(() => PagelaEntity, (p) => p.sheltered, { cascade: false })
  pagelas: PagelaEntity[];

  @OneToMany(() => AcceptedChristEntity, (ac) => ac.sheltered, { cascade: true })
  acceptedChrists: AcceptedChristEntity[];
}
