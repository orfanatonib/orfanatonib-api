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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TeamsService } from './services/teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(
    private readonly service: TeamsService,
    private readonly authContext: AuthContextService,
  ) {}

  @Post()
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    return this.service.findAll();
  }

  @Get('my-teams')
  async findMyTeams(@Req() req: Request): Promise<TeamResponseDto[]> {
    const userId = await this.authContext.getUserId(req);
    const role = await this.authContext.getRole(req);

    if (!userId || !role) {
      return [];
    }

    return this.service.findByUserContext(userId, role);
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
    await this.service.remove(id);
  }
}

