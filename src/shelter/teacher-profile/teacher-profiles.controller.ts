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
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { TeacherResponseDto } from './dto/teacher-profile.response.dto';
import { TeacherSimpleListDto } from './dto/teacher-simple-list.dto';
import { PageDto, TeacherProfilesQueryDto } from './dto/teacher-profiles.query.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { ManageTeacherTeamDto } from './dto/assign-team.dto';

@Controller('teacher-profiles')
@UseGuards(JwtAuthGuard)
export class TeacherProfilesController {
  private readonly logger = new Logger(TeacherProfilesController.name);

  constructor(private readonly service: TeacherProfilesService) { }


  @Get()
  findPage(
    @Req() req: Request,
    @Query() query: TeacherProfilesQueryDto,
  ): Promise<PageDto<TeacherResponseDto>> {
    return this.service.findPage(req, query);
  }

  @Get('simple')
  listSimple(@Req() req: Request): Promise<TeacherSimpleListDto[]> {
    return this.service.list(req);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<TeacherResponseDto> {
    return this.service.findOne(id, req);
  }

  @Put(':teacherId')
  async update(
    @Param('teacherId', new ParseUUIDPipe()) teacherId: string,
    @Body() dto: ManageTeacherTeamDto,
    @Req() req: Request,
  ): Promise<TeacherResponseDto> {
    this.logger.log(`Updating teacher profile: ${teacherId}`);
    const result = await this.service.manageTeam(teacherId, dto, req);
    this.logger.log(`Teacher profile updated successfully: ${teacherId}`);
    return result;
  }
}
