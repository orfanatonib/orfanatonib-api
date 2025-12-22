import { BaseEntity } from 'src/share/share-entity/base.entity';
import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { AddressEntity } from 'src/modules/addresses/entities/address.entity/address.entity';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { RouteEntity } from 'src/route/route-page.entity';

@Entity('shelters')
export class ShelterEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true })
  teamsQuantity?: number;

  @OneToOne(() => AddressEntity, { cascade: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'address_id' })
  address: AddressEntity;

  @OneToMany(() => TeamEntity, (team) => team.shelter, { cascade: false })
  teams: TeamEntity[];

  @OneToMany(() => ShelteredEntity, (sheltered) => sheltered.shelter, { cascade: false })
  sheltered: ShelteredEntity[];

  @OneToOne(() => RouteEntity, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  route?: RouteEntity | null;

}
