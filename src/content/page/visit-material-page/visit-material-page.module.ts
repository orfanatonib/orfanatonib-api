import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VisitMaterialsPageRepository } from './visit-material.repository';
import { VisitMaterialsPageEntity } from './entities/visit-material-page.entity';
import { RouteModule } from 'src/infrastructure/route/route.module';
import { MediaModule } from 'src/shared/media/media.module';
import { VisitMaterialsPageController } from './visit-material-page.controller';
import { VisitMaterialsPageCreateService } from './services/VisitMaterialsPageCreateService';
import { VisitMaterialsPageUpdateService } from './services/VisitMaterialsPageUpdateService';
import { VisitMaterialsPageRemoveService } from './services/VisitMaterialsPageRemoveService';
import { VisitMaterialsPageGetService } from './services/VisitMaterialsPageGetService';
@Module({
  imports: [
    TypeOrmModule.forFeature([VisitMaterialsPageEntity]),
    RouteModule,
    MediaModule,
  ],
  controllers: [VisitMaterialsPageController],
  providers: [
    VisitMaterialsPageRepository,
    VisitMaterialsPageCreateService,
    VisitMaterialsPageUpdateService,
    VisitMaterialsPageRemoveService,
    VisitMaterialsPageGetService,
  ],
  exports: [TypeOrmModule],
})
export class VisitMaterialsPageModule { }