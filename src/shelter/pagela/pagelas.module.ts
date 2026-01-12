import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagelaEntity } from './entities/pagela.entity';
import { ShelteredEntity } from 'src/shelter/sheltered/entities/sheltered.entity';
import { MemberProfileEntity } from 'src/shelter/member-profile/entities/member-profile.entity/member-profile.entity';
import { PagelasRepository } from './pagelas.repository';
import { PagelasService } from './pagelas.service';
import { PagelasController } from './pagelas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PagelaEntity, ShelteredEntity, MemberProfileEntity])],
  controllers: [PagelasController],
  providers: [PagelasRepository, PagelasService],
  exports: [PagelasService, PagelasRepository],
})
export class PagelasModule { }
