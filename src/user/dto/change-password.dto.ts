import { IsString, MinLength } from 'class-validator';

/**
 * DTO para alteração de senha
 * Requer a senha atual e a nova senha
 */
export class ChangePasswordDto {
  @IsString({ message: 'A senha atual é obrigatória' })
  currentPassword: string;

  @IsString({ message: 'A nova senha é obrigatória' })
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  newPassword: string;
}

