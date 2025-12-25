import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../user.repository';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordService {
  private readonly logger = new Logger(ChangePasswordService.name);

  constructor(private readonly userRepo: UserRepository) {}

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    // Buscar o usuário
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Se for commonUser (usuário comum), a senha atual é obrigatória
    if (user.commonUser) {
      if (!dto.currentPassword) {
        throw new BadRequestException('A senha atual é obrigatória para usuários comuns');
      }

      // Verificar se a senha atual está correta
      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }
    }

    // Verificar se a nova senha é diferente da atual (se houver senha atual)
    if (user.password) {
      const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('A nova senha deve ser diferente da senha atual');
      }
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    // Atualizar a senha
    await this.userRepo.update(userId, { password: hashedNewPassword });

    this.logger.log(`Senha alterada para o usuário: ${userId} (commonUser: ${user.commonUser})`);

    return { message: 'Senha alterada com sucesso' };
  }
}

