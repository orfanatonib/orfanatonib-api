import {
  Controller,
  Get,
  Param,
  Logger,
  UseGuards,
  NotFoundException,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { RouteService } from "./services/route.service";
import { RouteEntity } from "./route-page.entity";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { CleanupOrphanRoutesService } from "./services/cleanup-orphan-routes.service";

@Controller("routes")
export class RouteController {
  private readonly logger = new Logger(RouteController.name);

  constructor(
    private readonly routeService: RouteService,
    private readonly cleanupService: CleanupOrphanRoutesService,
    private readonly authContext: AuthContextService,
  ) {}

  /** Anônimo recebe só rotas públicas; sessão válida recebe todas. */
  @Get()
  async findAll(@Req() req: Request): Promise<RouteEntity[]> {
    return this.routeService.findAllRoutes({
      includeNonPublic: await this.authContext.isLoggedIn(req),
    });
  }

  @Get("orphans/check")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async checkOrphanRoutes() {
    return this.cleanupService.findOrphanRoutes();
  }

  @Post("orphans/cleanup")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async cleanupOrphanRoutes() {
    this.logger.log("Cleaning up orphan routes");
    const result = await this.cleanupService.cleanupOrphanRoutes();
    this.logger.log("Orphan routes cleaned up successfully");
    return result;
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<RouteEntity> {
    const route = await this.routeService.findById(id, {
      includeNonPublic: await this.authContext.isLoggedIn(req),
    });
    if (!route) {
      throw new NotFoundException("Route not found");
    }
    return route;
  }
}
