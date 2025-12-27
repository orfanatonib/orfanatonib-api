import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
  Put,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { LeaderProfilesService } from './services/leader-profiles.service';
import { LeaderResponseDto } from './dto/leader-profile.response.dto';
import { LeaderSimpleListDto } from './dto/leader-simple-list.dto';
import { PageDto, LeaderProfilesQueryDto } from './dto/leader-profiles.query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ManageLeaderTeamDto, ManageLeaderTeamsDto, ShelterTeamDto } from './dto/assign-team.dto';
import { ShelterWithLeaderStatusDto } from 'src/modules/shelters/dto/shelter.response.dto';

@Controller('leader-profiles')
@UseGuards(JwtAuthGuard)
export class LeaderProfilesController {
  private readonly logger = new Logger(LeaderProfilesController.name);

  constructor(private readonly service: LeaderProfilesService) { }

  @Get()
  findPage(
    @Req() req: Request,
    @Query() query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    return this.service.findPage(req, query);
  }

  @Get('simple')
  listSimple(@Req() req: Request): Promise<LeaderSimpleListDto[]> {
    return this.service.list(req);
  }

  @Get('my-shelters')
  findMyShelters(@Req() req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    return this.service.findMyShelters(req);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<LeaderResponseDto> {
    return this.service.findOne(id, req);
  }

  @Put(':leaderId')
  async update(
    @Param('leaderId', new ParseUUIDPipe()) leaderId: string,
    @Body() dto: ShelterTeamDto[],
    @Req() req: Request,
  ): Promise<LeaderResponseDto> {
    this.logger.log(`Updating leader profile: ${leaderId}`);
    const result = await this.service.manageTeams(leaderId, { assignments: dto }, req);
    this.logger.log(`Leader profile updated successfully: ${leaderId}`);
    return result;
  }
}
