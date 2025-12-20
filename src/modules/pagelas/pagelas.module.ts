import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagelaEntity } from './entities/pagela.entity';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { TeacherProfileEntity } from 'src/modules/teacher-profiles/entities/teacher-profile.entity/teacher-profile.entity';
import { PagelasRepository } from './pagelas.repository';
import { PagelasService } from './pagelas.service';
import { PagelasController } from './pagelas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PagelaEntity, ShelteredEntity, TeacherProfileEntity])],
  controllers: [PagelasController],
  providers: [PagelasRepository, PagelasService],
  exports: [PagelasService, PagelasRepository],
})
export class PagelasModule { }
