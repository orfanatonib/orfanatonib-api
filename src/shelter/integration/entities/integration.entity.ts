import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('integrations')
export class IntegrationEntity extends BaseEntity {
    @Column({ nullable: true })
    name?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    gaLeader?: string;

    @Column({ type: 'boolean', nullable: true })
    baptized?: boolean;

    @Column({ type: 'int', nullable: true })
    churchYears?: number;

    @Column({ nullable: true })
    previousMinistry?: string;

    @Column({ type: 'int', nullable: true })
    integrationYear?: number;
}
