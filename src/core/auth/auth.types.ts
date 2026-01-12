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
