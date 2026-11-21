import { UserRole } from "src/core/auth/auth.types";

import {
  DEFAULT_FEATURE_FLAGS,
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

/**
 * Decisão de uma flag que **não existe no banco**: vale o padrão do catálogo
 * (não `false`), senão um registro apagado derrubaria a funcionalidade. Chave
 * fora do catálogo continua desligada.
 */
export function catalogDefaultFor(
  key: string,
  role?: UserRole | string | null,
): boolean {
  const definition = DEFAULT_FEATURE_FLAGS.find((flag) => flag.key === key);
  if (!definition || !definition.enabled) return false;
  if (definition.targetRoles.length === 0) return true;
  if (!role) return false;

  const normalized = String(role).toLowerCase().trim();
  return (
    isUserRole(normalized) &&
    (definition.targetRoles as readonly string[]).includes(normalized)
  );
}

/**
 * Flag protegida = a coluna `protected` OU qualquer chave do catálogo de
 * fábrica (linhas anteriores à coluna ainda não têm o campo preenchido).
 */
export function isProtectedFlag(
  flag: Pick<FeatureFlagEntity, "key" | "isProtected">,
): boolean {
  return (
    flag.isProtected === true ||
    DEFAULT_FEATURE_FLAGS.some((definition) => definition.key === flag.key)
  );
}
