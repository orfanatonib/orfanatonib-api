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
import { MemberProfilesService } from './services/member-profiles.service';
import { MemberResponseDto } from './dto/member-profile.response.dto';
import { MemberSimpleListDto } from './dto/member-simple-list.dto';
import { PageDto, MemberProfilesQueryDto } from './dto/member-profiles.query.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { ManageMemberTeamDto } from './dto/assign-team.dto';

@Controller('member-profiles')
@UseGuards(JwtAuthGuard)
export class MemberProfilesController {
  private readonly logger = new Logger(MemberProfilesController.name);

  constructor(private readonly service: MemberProfilesService) { }


  @Get()
  findPage(
    @Req() req: Request,
    @Query() query: MemberProfilesQueryDto,
  ): Promise<PageDto<MemberResponseDto>> {
    return this.service.findPage(req, query);
  }

  @Get('simple')
  listSimple(@Req() req: Request): Promise<MemberSimpleListDto[]> {
    return this.service.list(req);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<MemberResponseDto> {
    return this.service.findOne(id, req);
  }

  @Put(':memberId')
  async update(
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body() dto: ManageMemberTeamDto,
    @Req() req: Request,
  ): Promise<MemberResponseDto> {
    this.logger.log(`Updating member profile: ${memberId}`);
    const result = await this.service.manageTeam(memberId, dto, req);
    this.logger.log(`Member profile updated successfully: ${memberId}`);
    return result;
  }
}
