import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  UseGuards,
  Logger,
  Query,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { UserImageBody } from "./services/update-user-image.service";
import { USER_IMAGE_UPLOAD_OPTIONS } from "./constants/user.constants";
import { CreateUserService } from "./services/create-user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import {
  AdminRoleGuard,
  AdminOrLeaderRoleGuard,
} from "src/core/auth/guards/role-guard";
import { GetUsersQueryDto } from "./dto/get-users-query.dto";
import { GetUsersService } from "./services/get-user.service";
import { DeleteUserService } from "./services/delete-user.service";
import { UpdateUserService } from "./services/update-user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserImageService } from "./services/update-user-image.service";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

import { SafeUser, toSafeUser } from "./mappers/safe-user.mapper";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly createUserService: CreateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly getUsersService: GetUsersService,
    private readonly updateUserImageService: UpdateUserImageService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseGuards(AdminRoleGuard)
  async create(@Body() dto: CreateUserDto) {
    this.logger.log("Creating new user");
    const result = await this.createUserService.create(dto);
    this.logger.log(`User created successfully: ${result.id}`);
    return toSafeUser(result);
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(AdminRoleGuard)
  findAll(@Query() query: GetUsersQueryDto) {
    return this.getUsersService.findAllPaginated(query);
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get("simple")
  @UseGuards(AdminRoleGuard)
  findAllSimple() {
    return this.getUsersService.findAllSimple();
  }

  @Get("simple-for-select")
  @UseGuards(AdminOrLeaderRoleGuard)
  findAllSimpleForSelect() {
    return this.getUsersService.findAllSimple();
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(AdminRoleGuard)
  async findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return toSafeUser(await this.getUsersService.findOne(id));
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get(":id/profile")
  @UseGuards(AdminRoleGuard)
  async findOneProfile(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getUsersService.findOneForProfile(id);
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  @UseGuards(AdminRoleGuard)
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<SafeUser> {
    this.logger.log(`Updating user: ${id}`);
    const result = await this.updateUserService.update(id, dto);
    this.logger.log(`User updated successfully: ${id}`);
    return toSafeUser(result);
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(AdminRoleGuard)
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    this.logger.log(`Deleting user: ${id}`);
    await this.deleteUserService.remove(id);
    this.logger.log(`User deleted successfully: ${id}`);
    return { message: "User removed successfully" };
  }

  @FeatureFlag(FeatureFlagKeys.USER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id/image")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor(USER_IMAGE_UPLOAD_OPTIONS))
  async updateImage(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body("imageData") imageDataRaw?: string,
    @Body() body?: UserImageBody,
  ): Promise<SafeUser> {
    this.logger.log(`Updating user image: ${id}`);
    const bodyToProcess = imageDataRaw
      ? { imageData: imageDataRaw }
      : body || {};
    const result = await this.updateUserImageService.updateUserImage(
      id,
      bodyToProcess,
      files,
    );
    this.logger.log(`User image updated successfully: ${id}`);
    return toSafeUser(result);
  }
}
