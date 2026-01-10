import { BaseEntity } from 'src/shared/entity/base.entity';
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ShelteredEntity } from 'src/shelter/sheltered/entities/sheltered.entity';
import { TeacherProfileEntity } from 'src/shelter/teacher-profile/entities/teacher-profile.entity/teacher-profile.entity';

@Entity('pagelas')
@Unique('UQ_pagela_sheltered_year_visit', ['sheltered', 'year', 'visit'])
export class PagelaEntity extends BaseEntity {
  
  @Column({ type: 'int', unsigned: true })
  visit: number;

  @Column({ type: 'smallint', unsigned: true })
  year: number;

  @Column({ type: 'date' })
  referenceDate: string;

  @Column({ type: 'boolean', default: false })
  present: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string | null;

  @ManyToOne(() => ShelteredEntity, (sheltered) => sheltered.pagelas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sheltered_id' })
  sheltered: ShelteredEntity;

  @ManyToOne(() => TeacherProfileEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_profile_id' })
  teacher: TeacherProfileEntity;
}
