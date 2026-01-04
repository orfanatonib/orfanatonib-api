import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  Logger,
  UseGuards,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateShelterScheduleDto } from './dto/create-shelter-schedule.dto';
import { UpdateShelterScheduleDto } from './dto/update-shelter-schedule.dto';
import { ShelterScheduleResponseDto } from './dto/shelter-schedule-response.dto';
import { CreateShelterScheduleService } from './services/create-shelter-schedule.service';
import { ListShelterSchedulesService } from './services/list-shelter-schedules.service';
import { UpdateShelterScheduleService } from './services/update-shelter-schedule.service';
import { DeleteShelterScheduleService } from './services/delete-shelter-schedule.service';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('shelter-schedules')
@UseGuards(JwtAuthGuard)
export class ShelterScheduleController {
  private readonly logger = new Logger(ShelterScheduleController.name);

  constructor(
    private readonly createService: CreateShelterScheduleService,
    private readonly listService: ListShelterSchedulesService,
    private readonly updateService: UpdateShelterScheduleService,
    private readonly deleteService: DeleteShelterScheduleService,
  ) {}

  @UseGuards(AdminOrLeaderRoleGuard)
  @Post()
  async create(
    @Body(ValidationPipe) dto: CreateShelterScheduleDto,
  ): Promise<ShelterScheduleResponseDto> {
    this.logger.log('Creating new shelter schedule');
    const result = await this.createService.execute(dto);
    this.logger.log(`Shelter schedule created successfully: ${result.id}`);
    return ShelterScheduleResponseDto.fromEntity(result);
  }

  @Get()
  async findAll(@Req() req: Request): Promise<ShelterScheduleResponseDto[]> {
    this.logger.log('Listing shelter schedules');
    const schedules = await this.listService.execute(req);
    return schedules.map(ShelterScheduleResponseDto.fromEntity);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateShelterScheduleDto,
  ): Promise<ShelterScheduleResponseDto> {
    this.logger.log(`Updating shelter schedule: ${id}`);
    const result = await this.updateService.execute(id, dto);
    this.logger.log(`Shelter schedule updated successfully: ${id}`);
    return ShelterScheduleResponseDto.fromEntity(result);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting shelter schedule: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Shelter schedule deleted successfully: ${id}`);
  }
}
