import { UserRole } from "src/core/auth/auth.types";

import {
  FEATURE_FLAG_AUDIENCES,
  FEATURE_FLAG_TARGET_ROLES_METADATA_KEY,
} from "./constants";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import {
  FEATURE_FLAG_AUDIENCE_ROLES,
  FEATURE_FLAG_ROLE_ORDER,
  FeatureFlagAudience,
} from "./types";

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function normalizeTargetRoles(
  roles?: readonly string[] | null,
): UserRole[] {
  if (!roles || roles.length === 0) return [];

  const normalized = new Set<UserRole>();
  for (const role of roles) {
    const candidate = String(role).toLowerCase().trim();
    if (isUserRole(candidate)) normalized.add(candidate);
  }

  return FEATURE_FLAG_ROLE_ORDER.filter((role) => normalized.has(role));
}

export function targetRolesOf(flag: FeatureFlagEntity): UserRole[] {
  const stored = flag.metadata?.[FEATURE_FLAG_TARGET_ROLES_METADATA_KEY];
  if (!Array.isArray(stored)) return [];
  return normalizeTargetRoles(stored.map((role) => String(role)));
}

export function publicMetadataOf(
  flag: FeatureFlagEntity,
): Record<string, unknown> | null {
  if (!flag.metadata) return null;

  const metadata = { ...flag.metadata };
  delete metadata[FEATURE_FLAG_TARGET_ROLES_METADATA_KEY];
  return Object.keys(metadata).length > 0 ? metadata : null;
}

export function metadataWithTargetRoles(
  metadata: Record<string, unknown> | null | undefined,
  targetRoles: readonly string[] | null | undefined,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [FEATURE_FLAG_TARGET_ROLES_METADATA_KEY]: normalizeTargetRoles(targetRoles),
  };
}

export function audienceOfRoles(roles: UserRole[]): FeatureFlagAudience {
  const signature = normalizeTargetRoles(roles).join(",");
  return (
    FEATURE_FLAG_AUDIENCES.find(
      (audience) =>
        FEATURE_FLAG_AUDIENCE_ROLES[audience].join(",") === signature,
    ) ?? "EVERYONE"
  );
}

export function rolesOfAudience(audience: FeatureFlagAudience): UserRole[] {
  return [...FEATURE_FLAG_AUDIENCE_ROLES[audience]];
}

export function isTargetedForRole(
  flag: FeatureFlagEntity,
  role?: UserRole | string | null,
): boolean {
  if (!flag.enabled) return false;

  const targetRoles = targetRolesOf(flag);
  if (targetRoles.length === 0) return true;
  if (!role) return false;

  const normalized = String(role).toLowerCase().trim();
  return isUserRole(normalized) && targetRoles.includes(normalized);
}
