import { UserEntity } from "src/core/user/entities/user.entity";
import { AuthUserDto } from "../dto/auth.response.dto";

/**
 * Usuário exposto por login e registro. Recorta explicitamente: `password` e
 * `refreshToken` são colunas da entidade e não podem vazar na resposta.
 */
export const toAuthUserDto = (user: UserEntity): AuthUserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  active: user.active,
  completed: user.completed,
  commonUser: user.commonUser,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
