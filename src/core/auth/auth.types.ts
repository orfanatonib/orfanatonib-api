import { Request } from 'express';

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  LEADER = 'leader',
}

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: UserRole | string;
  iat?: number;
  exp?: number;
};

export type AuthRequest = Request & {
  user?: {
    id?: string;
    role?: UserRole | string;
    email?: string;
  };
};

/**
 * Shape produced by `JwtStrategy.validate` and attached to `request.user`
 * by `JwtAuthGuard`. Prefer it over re-decoding the token in a controller.
 */
export type AuthenticatedUser = {
  userId: string;
  email?: string;
  role?: UserRole | string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
