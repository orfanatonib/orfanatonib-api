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
    return this.createService.createInformative(dto);
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
    return this.updateService.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.deleteService.execute(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<InformativeResponseDto[]> {
    return this.getService.findAll();
  }
}
