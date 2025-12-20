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
} from '@nestjs/common';
import { TeamsService } from './services/teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Post()
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.service.create(dto);
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
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}

