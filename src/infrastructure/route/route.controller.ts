import {
  Controller,
  Get,
  Delete,
  Param,
  Logger,
  UseGuards,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { RouteEntity } from './route-page.entity';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';
import { CleanupOrphanRoutesService } from './services/cleanup-orphan-routes.service';

@Controller('routes')
export class RouteController {
  private readonly logger = new Logger(RouteController.name);

  constructor(
    private readonly routeService: RouteService,
    private readonly cleanupService: CleanupOrphanRoutesService,
  ) {}

  @Get()
  async findAll(): Promise<RouteEntity[]> {
    return this.routeService.findAllRoutes();
  }

  @Get('orphans/check')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async checkOrphanRoutes() {
    return this.cleanupService.findOrphanRoutes();
  }

  @Post('orphans/cleanup')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async cleanupOrphanRoutes() {
    this.logger.log('Cleaning up orphan routes');
    const result = await this.cleanupService.cleanupOrphanRoutes();
    this.logger.log('Orphan routes cleaned up successfully');
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RouteEntity> {
    const route = await this.routeService.findById(id);
    if (!route) {
      throw new NotFoundException('Route not found');
    }
    return route;
  }
}
