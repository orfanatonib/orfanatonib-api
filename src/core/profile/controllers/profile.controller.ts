import type { Request as ExpressRequest } from "express";
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
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "../../auth/guards/role-guard";
import { AuthContextService } from "../../auth/services/auth-context.service";
import { CreateCompleteProfileDto } from "../dto/create-complete-profile.dto";
import { UpdateCompleteProfileDto } from "../dto/update-complete-profile.dto";
import { CompleteProfileResponseDto } from "../dto/complete-profile-response.dto";
import { QueryProfilesDto } from "../dto/query-profiles.dto";
import { PaginatedProfilesResponseDto } from "../dto/paginated-profiles-response.dto";
import { CreateProfileService } from "../services/profile/create-profile.service";
import { GetAllProfilesService } from "../services/profile/get-all-profiles.service";
import { GetOneProfileService } from "../services/profile/get-one-profile.service";
import { UpdateProfileService } from "../services/profile/update-profile.service";
import { DeleteProfileService } from "../services/profile/delete-profile.service";
import { UserRole } from "../../auth/auth.types";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("profiles")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    private readonly authContextService: AuthContextService,
    private readonly createProfileService: CreateProfileService,
    private readonly getAllProfilesService: GetAllProfilesService,
    private readonly getOneProfileService: GetOneProfileService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly deleteProfileService: DeleteProfileService,
  ) {}

  // Cada um cria o PRÓPRIO perfil: vale também para quem não é admin.
  @FeatureFlag({
    anyOf: [FeatureFlagKeys.USER_MANAGEMENT, FeatureFlagKeys.MEMBER_AREA],
  })
  @UseGuards(FeatureFlagGuard)
  @Post()
  async createProfile(
    @Request() req: ExpressRequest,
    @Body() createProfileDto: CreateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException("User not authenticated");
    this.logger.log(`Creating profile for user: ${userId}`);
    const result = await this.createProfileService.execute(
      userId,
      createProfileDto,
    );
    this.logger.log(`Profile created successfully for user: ${userId}`);
    return result;
  }

  // Admin e líder listam (o serviço escopa): o líder não tem `user_management`.
  @FeatureFlag({
    anyOf: [FeatureFlagKeys.USER_MANAGEMENT, FeatureFlagKeys.LEADER_MANAGEMENT],
  })
  @UseGuards(FeatureFlagGuard)
  @Get()
  async getAllProfiles(
    @Request() req: ExpressRequest,
    @Query() queryDto: QueryProfilesDto,
  ): Promise<PaginatedProfilesResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException("User not authenticated");

    const userRole = await this.authContextService.getRole(req);
    if (!userRole) throw new ForbiddenException("User role not found");

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.LEADER) {
      throw new ForbiddenException("Only admins and leaders can list profiles");
    }

    return this.getAllProfilesService.execute(userId, userRole, queryDto);
  }

  @Get("me")
  async getMyProfile(
    @Request() req: ExpressRequest,
  ): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException("User not authenticated");
    return this.getOneProfileService.execute(userId);
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(AdminRoleGuard)
  async getProfileById(
    @Param("id") id: string,
  ): Promise<CompleteProfileResponseDto> {
    return this.getOneProfileService.execute(id);
  }

  @Put("me")
  async updateMyProfile(
    @Request() req: ExpressRequest,
    @Body() updateProfileDto: UpdateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const userId = await this.authContextService.getUserId(req);
    if (!userId) throw new ForbiddenException("User not authenticated");

    const userRole = await this.authContextService.getRole(req);

    if (userRole === UserRole.MEMBER || userRole === UserRole.LEADER) {
      this.logger.log(`Updating own profile for user: ${userId}`);
      const result = await this.updateProfileService.execute(
        userId,
        updateProfileDto,
      );
      this.logger.log(`Own profile updated successfully for user: ${userId}`);
      return result;
    }

    if (userRole === UserRole.ADMIN) {
      this.logger.log(`Admin updating profile for user: ${userId}`);
      const result = await this.updateProfileService.execute(
        userId,
        updateProfileDto,
      );
      this.logger.log(`Profile updated successfully for user: ${userId}`);
      return result;
    }

    throw new ForbiddenException("Insufficient permissions");
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  @UseGuards(AdminRoleGuard)
  async updateProfileById(
    @Param("id") id: string,
    @Body() updateProfileDto: UpdateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    this.logger.log(`Updating profile by ID: ${id}`);
    const result = await this.updateProfileService.execute(
      id,
      updateProfileDto,
    );
    this.logger.log(`Profile updated successfully: ${id}`);
    return result;
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(AdminRoleGuard)
  async deleteProfile(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting profile: ${id}`);
    await this.deleteProfileService.execute(id);
    this.logger.log(`Profile deleted successfully: ${id}`);
  }
}
