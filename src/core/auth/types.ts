import { UserEntity } from "src/core/user/entities/user.entity";

/** Par de tokens devolvido por login, login Google e refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Claims que a API assina. `sub` é o id do usuário. */
export interface AuthTokenClaims {
  sub: string;
  email: string;
  role: UserEntity["role"];
}

/**
 * Claims do refresh. O `jti` existe só para que duas emissões seguidas nunca
 * produzam a mesma string — sem ele, dois refresh no mesmo segundo saem
 * idênticos (mesmas claims, mesmo `iat`) e a rotação não invalida o anterior.
 */
export interface RefreshTokenClaims extends AuthTokenClaims {
  jti: string;
}

/** Cookies e query string não vêm tipados no `Request` do Express. */
export interface RequestTokenCarriers {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, unknown>;
  query?: Record<string, unknown>;
}
