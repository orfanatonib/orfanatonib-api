import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UploadedFiles,
  UseInterceptors,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

import { VisitMaterialsPageResponseDTO } from './dto/visit-material-response.dto';
import { VisitMaterialsPageCreateService } from './services/VisitMaterialsPageCreateService';
import { VisitMaterialsPageUpdateService } from './services/VisitMaterialsPageUpdateService';
import { VisitMaterialsPageGetService } from './services/VisitMaterialsPageGetService';
import { VisitMaterialsPageRemoveService } from './services/VisitMaterialsPageRemoveService';
import { QueryVisitMaterialsPageDto } from './dto/query-visit-material-pages.dto';

import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('visit-material-pages')
@UseGuards(JwtAuthGuard)
export class VisitMaterialsPageController {
  private readonly logger = new Logger(VisitMaterialsPageController.name);

  constructor(
    private readonly createService: VisitMaterialsPageCreateService,
    private readonly updateService: VisitMaterialsPageUpdateService,
    private readonly removeService: VisitMaterialsPageRemoveService,
    private readonly getService: VisitMaterialsPageGetService,
  ) { }

  @UseGuards(AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('visitMaterialsPageData') raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    this.logger.log('Creating new visit material page');
    const result = await this.createService.createFromRaw(raw, files);
    this.logger.log(`Visit material page created successfully: ${result.id}`);
    return result;
  }

  @UseGuards(AdminRoleGuard)
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('visitMaterialsPageData') raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    this.logger.log(`Updating visit material page: ${id}`);
    const result = await this.updateService.updateFromRaw(id, raw, files);
    this.logger.log(`Visit material page updated successfully: ${id}`);
    return result;
  }

  @UseGuards(AdminRoleGuard)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting visit material page: ${id}`);
    await this.removeService.removeVisitMaterial(id);
    this.logger.log(`Visit material page deleted successfully: ${id}`);
  }

  @Get()
  async findAll(
    @Query() query: QueryVisitMaterialsPageDto,
  ): Promise<VisitMaterialsPageResponseDTO[]> {
    return this.getService.findAllPagesWithMedia(query);
  }

  @Get('/current-material')
  async getCurrentMaterial() {
    return this.getService.getCurrentWeek();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<VisitMaterialsPageResponseDTO> {
    return this.getService.findPageWithMedia(id);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('/current-material/:id')
  async setCurrentMaterial(@Param('id') id: string): Promise<any> {
    this.logger.log(`Setting current material: ${id}`);
    const result = await this.getService.setCurrentWeek(id);
    this.logger.log(`Current material set successfully: ${id}`);
    return result;
  }
}
