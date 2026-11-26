import { UserRole } from "src/core/auth/auth.types";

import { FEATURE_FLAG_AUDIENCES, FEATURE_FLAG_SORT_FIELDS } from "./constants";

export type FeatureFlagSortField = (typeof FEATURE_FLAG_SORT_FIELDS)[number];
export type FeatureFlagSortOrder = "ASC" | "DESC";
export type FeatureFlagAudience = (typeof FEATURE_FLAG_AUDIENCES)[number];

export const FEATURE_FLAG_AUDIENCE_ROLES: Record<
  FeatureFlagAudience,
  UserRole[]
> = {
  EVERYONE: [],
  ADMIN: [UserRole.ADMIN],
  LEADER: [UserRole.LEADER],
  MEMBER: [UserRole.MEMBER],
  ADMIN_LEADER: [UserRole.ADMIN, UserRole.LEADER],
  ADMIN_MEMBER: [UserRole.ADMIN, UserRole.MEMBER],
  LEADER_MEMBER: [UserRole.LEADER, UserRole.MEMBER],
  ALL_ROLES: [UserRole.ADMIN, UserRole.LEADER, UserRole.MEMBER],
};

export const FEATURE_FLAG_ROLE_ORDER: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LEADER,
  UserRole.MEMBER,
];

/** Mensagem trafegada no canal de invalidação; `key = null` invalida tudo. */
export interface FeatureFlagInvalidationMessage {
  origin: string;
  key: string | null;
}

export type RemoteInvalidationHandler = (key: string | null) => void;

/** Porta do transporte (Redis pub/sub em produção, falso nos testes). */
export interface FeatureFlagInvalidationTransport {
  publish(message: string): Promise<void>;
  subscribe(onMessage: (message: string) => void): Promise<void>;
  close(): Promise<void>;
}
