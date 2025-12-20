import { BaseEntity } from 'src/share/share-entity/base.entity';
import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AddressEntity } from 'src/modules/addresses/entities/address.entity/address.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { PagelaEntity } from 'src/modules/pagelas/entities/pagela.entity';
import { AcceptedChristEntity } from 'src/modules/accepted-christs/entities/accepted-christ.entity';

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

  @Column({ type: 'date' })
  birthDate: string;

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
