import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteEntity } from './route-page.entity';
import { RouteRepository } from './route-page.repository';
import { DataSource } from 'typeorm';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { MeditationModule } from 'src/content/meditation/meditation.module'; 
import { CleanupOrphanRoutesService } from './services/cleanup-orphan-routes.service'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteEntity]),
    forwardRef(() => MeditationModule),
  ],
  controllers: [RouteController],
  providers: [
    RouteService,
    CleanupOrphanRoutesService,
    {
      provide: RouteRepository,
      useFactory: (dataSource: DataSource) => new RouteRepository(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [RouteService, RouteRepository, CleanupOrphanRoutesService],
})
export class RouteModule { }
