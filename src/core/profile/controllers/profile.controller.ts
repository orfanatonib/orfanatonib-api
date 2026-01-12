import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/guards/role-guard';
import { AuthContextService } from '../../auth/services/auth-context.service';
import { CreateCompleteProfileDto } from '../dto/create-complete-profile.dto';
import { UpdateCompleteProfileDto } from '../dto/update-complete-profile.dto';
import { CompleteProfileResponseDto } from '../dto/complete-profile-response.dto';
import { QueryProfilesDto } from '../dto/query-profiles.dto';
import { PaginatedProfilesResponseDto } from '../dto/paginated-profiles-response.dto';
import { CreateProfileService } from '../services/profile/create-profile.service';
import { GetAllProfilesService } from '../services/profile/get-all-profiles.service';
import { GetOneProfileService } from '../services/profile/get-one-profile.service';
import { UpdateProfileService } from '../services/profile/update-profile.service';
import { DeleteProfileService } from '../services/profile/delete-profile.service';
import { UserRole } from '../../auth/auth.types';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly authContextService: AuthContextService,
    private readonly createProfileService: CreateProfileService,
    private readonly getAllProfilesService: GetAllProfilesService,
    private readonly getOneProfileService: GetOneProfileService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly deleteProfileService: DeleteProfileService,
  ) {}

  @Post()
  async createProfile(
    @Request() req,
    @Body() createProfileDto: CreateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException('User not authenticated');
    return this.createProfileService.execute(userId, createProfileDto);
  }

  @Get()
  async getAllProfiles(
    @Request() req,
    @Query() queryDto: QueryProfilesDto,
  ): Promise<PaginatedProfilesResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException('User not authenticated');

    const userRole = await this.authContextService.getRole(req);
    if (!userRole) throw new ForbiddenException('User role not found');

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.LEADER) {
      throw new ForbiddenException('Only admins and leaders can list profiles');
    }

    return this.getAllProfilesService.execute(userId, userRole, queryDto);
  }

  @Get('me')
  async getMyProfile(@Request() req): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException('User not authenticated');
    return this.getOneProfileService.execute(userId);
  }

  @Get(':id')
  @UseGuards(AdminRoleGuard)
  async getProfileById(
    @Param('id') id: string,
  ): Promise<CompleteProfileResponseDto> {
    return this.getOneProfileService.execute(id);
  }

  @Put('me')
  async updateMyProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException('User not authenticated');

    const userRole = await this.authContextService.getRole(req);

    if (userRole === UserRole.MEMBER || userRole === UserRole.LEADER) {
      return this.updateProfileService.execute(userId, updateProfileDto);
    }

    if (userRole === UserRole.ADMIN) {
      return this.updateProfileService.execute(userId, updateProfileDto);
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async updateProfileById(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    return this.updateProfileService.execute(id, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  async deleteProfile(@Param('id') id: string): Promise<void> {
    return this.deleteProfileService.execute(id);
  }
}
