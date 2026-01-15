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
  Logger,
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
  private readonly logger = new Logger(TeamsController.name);

  constructor(
    private readonly service: TeamsService,
    private readonly authContext: AuthContextService,
  ) { }

  @Post()
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    this.logger.log(`Creating team: ${dto.numberTeam}`);
    const result = await this.service.create(dto);
    this.logger.log(`Team created successfully: ${result.id}`);
    return result;
  }

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    this.logger.log('Fetching all teams');
    return this.service.findAll();
  }

  @Get('my-teams')
  async findMyTeams(@Req() req: Request): Promise<TeamResponseDto[]> {
    const userId = await this.authContext.getUserId(req);
    const role = await this.authContext.getRole(req);

    if (!userId || !role) {
      this.logger.log('User not identified for my-teams request');
      return [];
    }

    this.logger.log(`Fetching teams for user ${userId} with role ${role}`);
    return this.service.findByUserContext(userId, role);
  }

  @Get('by-shelter/:shelterId')
  async findByShelter(
    @Param('shelterId', new ParseUUIDPipe()) shelterId: string,
  ): Promise<TeamResponseDto[]> {
    this.logger.log(`Fetching teams for shelter ${shelterId}`);
    return this.service.findByShelter(shelterId);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Fetching team ${id}`);
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Updating team ${id}`);
    const result = await this.service.update(id, dto);
    this.logger.log(`Team updated successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    this.logger.log(`Deleting team ${id}`);
    await this.service.remove(id);
    this.logger.log(`Team deleted successfully: ${id}`);
  }
}

