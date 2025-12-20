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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { GetUsersService } from './services/get-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserImageService } from './services/update-user-image.service';
import { UserEntity } from './user.entity';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly createUserService: CreateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly getUsersService: GetUsersService,
    private readonly updateUserImageService: UpdateUserImageService,
  ) { }

  /**
   * Criar novo usuário (apenas admin)
   */
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.createUserService.create(dto);
  }

  /**
   * Listar todos os usuários com paginação (apenas admin)
   */
  @Get()
  findAll(@Query() query: GetUsersQueryDto) {
    return this.getUsersService.findAllPaginated(query);
  }

  /**
   * Buscar usuário por ID (apenas admin)
   */
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getUsersService.findOne(id);
  }

  /**
   * Atualizar usuário (apenas admin)
   * Admin pode alterar TUDO: name, email, phone, password, role, active, completed, commonUser
   * Para alterar senha, admin apenas envia a nova senha no campo "password" (não precisa da senha atual)
   */
  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.updateUserService.update(id, dto);
  }

  /**
   * Deletar usuário (apenas admin)
   */
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.deleteUserService.remove(id);
    return { message: 'User removed successfully' };
  }

  /**
   * Atualizar imagem de perfil de qualquer usuário (apenas admin)
   */
  @Patch(':id/image')
  @UseInterceptors(AnyFilesInterceptor())
  async updateImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body('imageData') imageDataRaw?: string,
    @Body() body?: any,
  ): Promise<UserEntity> {
    const bodyToProcess = imageDataRaw ? { imageData: imageDataRaw } : (body || {});
    return this.updateUserImageService.updateUserImage(id, bodyToProcess, files);
  }
}
