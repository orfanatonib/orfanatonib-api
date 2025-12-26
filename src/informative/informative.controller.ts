import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { CreateInformativeDto } from './dto/create-informative.dto';
import { UpdateInformativeDto } from './dto/update-informative.dto';
import { InformativeResponseDto } from './dto/informative-response.dto';
import { CreateInformativeService } from './services/create-informative.service';
import { GetInformativeService } from './services/get-informative.service';
import { UpdateInformativeService } from './services/update-informative.service';
import { DeleteInformativeService } from './services/delete-informative.service';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';

@Controller('informatives')
export class InformativeController {
  private readonly logger = new Logger(InformativeController.name);

  constructor(
    private readonly createService: CreateInformativeService,
    private readonly getService: GetInformativeService,
    private readonly updateService: UpdateInformativeService,
    private readonly deleteService: DeleteInformativeService,
  ) { }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  async create(@Body() dto: CreateInformativeDto): Promise<InformativeResponseDto> {
    this.logger.log('Creating new informative banner');
    const result = await this.createService.createInformative(dto);
    this.logger.log(`Informative banner created successfully: ${result.id}`);
    return result;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<InformativeResponseDto> {
    const found = await this.getService.findOne(id);

    if (!found) {
      throw new NotFoundException('Informative banner not found');
    }

    return found;
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInformativeDto,
  ): Promise<InformativeResponseDto> {
    this.logger.log(`Updating informative banner: ${id}`);
    const result = await this.updateService.execute(id, dto);
    this.logger.log(`Informative banner updated successfully: ${id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting informative banner: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Informative banner deleted successfully: ${id}`);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<InformativeResponseDto[]> {
    return this.getService.findAll();
  }
}
