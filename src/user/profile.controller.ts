import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  Logger,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthContextService } from 'src/auth/services/auth-context.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { ChangePasswordService } from './services/change-password.service';
import { UpdateOwnProfileService } from './services/update-own-profile.service';
import { UpdateUserImageService } from './services/update-user-image.service';
import { GetUsersService } from './services/get-user.service';
import { UserEntity } from './user.entity';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    private readonly authContextService: AuthContextService,
    private readonly getUsersService: GetUsersService,
    private readonly updateOwnProfileService: UpdateOwnProfileService,
    private readonly changePasswordService: ChangePasswordService,
    private readonly updateUserImageService: UpdateUserImageService,
  ) {}

  /**
   * Retorna os dados do próprio perfil do usuário autenticado
   * Não requer permissão de admin, apenas autenticação
   * Não retorna campos sensíveis (password, refreshToken)
   * Inclui imagem de perfil e perfis relacionados (teacher/leader)
   */
  @Get()
  async getOwnProfile(@Req() req: Request) {
    const payload = await this.authContextService.getPayloadFromRequest(req);
    const userId = payload.sub;

    return this.getUsersService.findOneForProfile(userId);
  }

  /**
   * Atualiza o perfil do próprio usuário (name, email, phone)
   * Não requer permissão de admin, apenas autenticação
   * Retorna o perfil atualizado sem campos sensíveis (password, refreshToken)
   */
  @Patch()
  async updateOwnProfile(
    @Req() req: Request,
    @Body() dto: UpdateOwnProfileDto,
  ) {
    const payload = await this.authContextService.getPayloadFromRequest(req);
    const userId = payload.sub;

    this.logger.log(`Updating own profile: ${userId}`);
    await this.updateOwnProfileService.updateOwnProfile(userId, dto);
    this.logger.log(`Own profile updated successfully: ${userId}`);
    return this.getUsersService.findOneForProfile(userId);
  }

  /**
   * Altera a senha do próprio usuário
   * Requer a senha atual e a nova senha
   * Não requer permissão de admin, apenas autenticação
   */
  @Patch('password')
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const payload = await this.authContextService.getPayloadFromRequest(req);
    const userId = payload.sub;

    this.logger.log(`Changing password for user: ${userId}`);
    const result = await this.changePasswordService.changePassword(userId, dto);
    this.logger.log(`Password changed successfully: ${userId}`);
    return result;
  }

  /**
   * Atualiza a imagem de perfil do próprio usuário
   * Não requer permissão de admin, apenas autenticação
   * Retorna o perfil atualizado sem campos sensíveis (password, refreshToken)
   */
  @Patch('image')
  @UseInterceptors(AnyFilesInterceptor())
  async updateOwnImage(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body('imageData') imageDataRaw?: string,
    @Body() body?: any,
  ) {
    const payload = await this.authContextService.getPayloadFromRequest(req);
    const userId = payload.sub;

    this.logger.log(`Updating own profile image: ${userId}`);
    const bodyToProcess = imageDataRaw ? { imageData: imageDataRaw } : (body || {});
    await this.updateUserImageService.updateUserImage(userId, bodyToProcess, files);
    this.logger.log(`Own profile image updated successfully: ${userId}`);
    return this.getUsersService.findOneForProfile(userId);
  }
}

