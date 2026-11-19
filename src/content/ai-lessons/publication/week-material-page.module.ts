import { Module } from '@nestjs/common';
import { VisitMaterialsPageModule } from 'src/content/page/visit-material-page/visit-material-page.module';
import { WeekMaterialsPageCreateService } from './services/create-week-material.service';
import { WeekMaterialsPageGetService } from './services/get-week-material.service';
@Module({ imports: [VisitMaterialsPageModule], providers: [WeekMaterialsPageCreateService, WeekMaterialsPageGetService], exports: [WeekMaterialsPageCreateService, WeekMaterialsPageGetService] })
export class WeekMaterialsPageModule {}
