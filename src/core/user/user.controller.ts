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
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreateUserService } from './services/create-user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard, AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { GetUsersService } from './services/get-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserImageService } from './services/update-user-image.service';
import { UserEntity } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly createUserService: CreateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly getUsersService: GetUsersService,
    private readonly updateUserImageService: UpdateUserImageService,
  ) { }


  @Post()
  @UseGuards(AdminRoleGuard)
  async create(@Body() dto: CreateUserDto) {
    this.logger.log('Creating new user');
    const result = await this.createUserService.create(dto);
    this.logger.log(`User created successfully: ${result.id}`);
    return result;
  }

 
  @Get()
  @UseGuards(AdminRoleGuard)
  findAll(@Query() query: GetUsersQueryDto) {
    return this.getUsersService.findAllPaginated(query);
  }


  @Get('simple')
  @UseGuards(AdminRoleGuard)
  findAllSimple() {
    return this.getUsersService.findAllSimple();
  }

 
  @Get('simple-for-select')
  @UseGuards(AdminOrLeaderRoleGuard)
  findAllSimpleForSelect() {
    return this.getUsersService.findAllSimple();
  }

  
  @Get(':id')
  @UseGuards(AdminRoleGuard)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getUsersService.findOne(id);
  }

  
  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    this.logger.log(`Updating user: ${id}`);
    const result = await this.updateUserService.update(id, dto);
    this.logger.log(`User updated successfully: ${id}`);
    return result;
  }


  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    this.logger.log(`Deleting user: ${id}`);
    await this.deleteUserService.remove(id);
    this.logger.log(`User deleted successfully: ${id}`);
    return { message: 'User removed successfully' };
  }

  @Patch(':id/image')
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async updateImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body('imageData') imageDataRaw?: string,
    @Body() body?: any,
  ): Promise<UserEntity> {
    this.logger.log(`Updating user image: ${id}`);
    const bodyToProcess = imageDataRaw ? { imageData: imageDataRaw } : (body || {});
    const result = await this.updateUserImageService.updateUserImage(id, bodyToProcess, files);
    this.logger.log(`User image updated successfully: ${id}`);
    return result;
  }
}
