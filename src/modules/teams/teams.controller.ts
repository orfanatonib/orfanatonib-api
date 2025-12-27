import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { TeamsService } from './services/teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  private readonly logger = new Logger(TeamsController.name);

  constructor(private readonly service: TeamsService) {}

  @Post()
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    this.logger.log('Creating new team');
    const result = await this.service.create(dto);
    this.logger.log(`Team created successfully: ${result.id}`);
    return result;
  }

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    return this.service.findAll();
  }

  @Get('by-shelter/:shelterId')
  async findByShelter(
    @Param('shelterId', new ParseUUIDPipe()) shelterId: string,
  ): Promise<TeamResponseDto[]> {
    return this.service.findByShelter(shelterId);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TeamResponseDto> {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Updating team: ${id}`);
    const result = await this.service.update(id, dto);
    this.logger.log(`Team updated successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    this.logger.log(`Deleting team: ${id}`);
    await this.service.remove(id);
    this.logger.log(`Team deleted successfully: ${id}`);
  }
}

