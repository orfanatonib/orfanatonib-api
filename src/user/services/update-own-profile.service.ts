import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { UpdateOwnProfileDto } from '../dto/update-own-profile.dto';
import { UserEntity } from '../user.entity';

@Injectable()
export class UpdateOwnProfileService {
  private readonly logger = new Logger(UpdateOwnProfileService.name);

  constructor(private readonly userRepo: UserRepository) {}

  async updateOwnProfile(
    userId: string,
    dto: UpdateOwnProfileDto,
  ): Promise<UserEntity> {
    // Buscar o usuário atual
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o email está sendo alterado e se já existe
    if (dto.email && dto.email !== currentUser.email) {
      const existingUser = await this.userRepo.findByEmail(dto.email);
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Este email já está em uso por outro usuário');
      }
    }

    // Preparar dados para atualização (apenas os campos permitidos)
    const updateData: Partial<UserEntity> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    // Se não houver nada para atualizar
    if (Object.keys(updateData).length === 0) {
      return currentUser;
    }

    // Atualizar o usuário
    const updatedUser = await this.userRepo.update(userId, updateData);

    this.logger.log(`Perfil atualizado para o usuário: ${userId}`);

    return updatedUser;
  }
}

