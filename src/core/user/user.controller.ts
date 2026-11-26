import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Logger,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
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
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

import { SafeUser, toSafeUser } from "./mappers/safe-user.mapper";
import { SHELTER_DIRECTORY_FLAGS } from "src/core/feature-flags/shared-read-flags";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly createUserService: CreateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly getUsersService: GetUsersService,
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

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
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
}
