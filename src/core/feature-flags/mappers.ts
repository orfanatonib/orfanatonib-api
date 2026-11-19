import { FeatureFlagResponseDto } from "./dto/feature-flag-response.dto";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { audienceOfRoles, publicMetadataOf, targetRolesOf } from "./utils";

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function toFeatureFlagResponse(
  flag: FeatureFlagEntity,
): FeatureFlagResponseDto {
  const targetRoles = targetRolesOf(flag);

  return {
    id: flag.id,
    key: flag.key,
    name: flag.name,
    description: flag.description ?? null,
    enabled: flag.enabled,
    targetRoles,
    audience: audienceOfRoles(targetRoles),
    metadata: publicMetadataOf(flag),
    createdAt: toIsoString(flag.createdAt),
    updatedAt: toIsoString(flag.updatedAt),
  };
}

export function toFeatureFlagResponseList(
  flags: FeatureFlagEntity[],
): FeatureFlagResponseDto[] {
  return flags.map(toFeatureFlagResponse);
}
