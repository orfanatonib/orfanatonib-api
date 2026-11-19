import type { UserEntity } from "../entities/user.entity";

/**
 * Usuário sem segredos: `password` (hash bcrypt) e `refreshToken` NUNCA saem
 * pela API, nem para o administrador. A entidade crua não é resposta (plano 07).
 */
export type SafeUser = Omit<UserEntity, "password" | "refreshToken">;

export function toSafeUser(user: UserEntity): SafeUser {
  const safe: Partial<UserEntity> = { ...user };
  delete safe.password;
  delete safe.refreshToken;
  return safe as SafeUser;
}
