import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RouteEntity } from "./route-page.entity";
import { RouteRepository } from "./route-page.repository";
import { DataSource } from "typeorm";
import { RouteService } from "./services/route.service";
import { RouteController } from "./route.controller";
import { MeditationModule } from "src/content/meditation/meditation.module";
import { JwtModule } from "@nestjs/jwt";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { CleanupOrphanRoutesService } from "./services/cleanup-orphan-routes.service";
import { RouteExistenceRepository } from "./route-existence.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteEntity]),
    forwardRef(() => MeditationModule),
    // Só decodifica/valida o token (secret explícito); evita importar o AuthModule (ciclo de módulos).
    JwtModule.register({}),
  ],
  controllers: [RouteController],
  providers: [
    RouteService,
    CleanupOrphanRoutesService,
    RouteExistenceRepository,
    AuthContextService,
    {
      provide: RouteRepository,
      useFactory: (dataSource: DataSource) => new RouteRepository(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [RouteService, RouteRepository, CleanupOrphanRoutesService],
})
export class RouteModule {}
