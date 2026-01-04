import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Logger } from '@nestjs/common';
import { PagelasService } from './pagelas.service';
import { CreatePagelaDto } from './dto/create-pagela.dto';
import { UpdatePagelaDto } from './dto/update-pagela.dto';
import { PagelaFiltersDto } from './dto/pagela-filters.dto';
import { PaginationQueryDto } from './dto/paginated.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';

@Controller('pagelas')
@UseGuards(JwtAuthGuard)
export class PagelasController {
  private readonly logger = new Logger(PagelasController.name);

  constructor(private readonly service: PagelasService) {}

  @Post()
  async create(@Body() dto: CreatePagelaDto) {
    this.logger.log('Creating new pagela');
    const result = await this.service.create(dto);
    this.logger.log(`Pagela created successfully: ${result.id}`);
    return result;
  }

  @Get()
  findAllSimple(@Query() filters: PagelaFiltersDto) {
    return this.service.findAllSimple(filters);
  }

  @Get('paginated')
  findAllPaginated(
    @Query() query: PagelaFiltersDto & PaginationQueryDto,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    return this.service.findAllPaginated(filters, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePagelaDto) {
    this.logger.log(`Updating pagela: ${id}`);
    const result = await this.service.update(id, dto);
    this.logger.log(`Pagela updated successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting pagela: ${id}`);
    await this.service.remove(id);
    this.logger.log(`Pagela deleted successfully: ${id}`);
  }
}
