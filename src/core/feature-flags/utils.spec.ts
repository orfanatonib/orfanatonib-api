import { UserRole } from "src/core/auth/auth.types";

import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import {
  catalogDefaultFor,
  audienceOfRoles,
  isPlaceholderFlagDescription,
  isTargetedForRole,
  metadataWithTargetRoles,
  normalizeTargetRoles,
  publicMetadataOf,
  targetRolesOf,
} from "./utils";

function buildFlag(
  targetRoles: readonly string[],
  enabled = true,
): FeatureFlagEntity {
  return Object.assign(new FeatureFlagEntity(), {
    id: "flag-id",
    key: "shelter-management",
    name: "Gestão de acolhidos",
    description: null,
    enabled,
    metadata: metadataWithTargetRoles({ rollout: 100 }, targetRoles),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("feature flag utilities", () => {
  it("normalizes roles in the canonical Orfanato order", () => {
    expect(normalizeTargetRoles([" MEMBER ", "admin", "member"])).toEqual([
      UserRole.ADMIN,
      UserRole.MEMBER,
    ]);
  });

  it("maps every audience combination", () => {
    expect(audienceOfRoles([])).toBe("EVERYONE");
    expect(audienceOfRoles([UserRole.ADMIN])).toBe("ADMIN");
    expect(audienceOfRoles([UserRole.LEADER])).toBe("LEADER");
    expect(audienceOfRoles([UserRole.MEMBER])).toBe("MEMBER");
    expect(audienceOfRoles([UserRole.ADMIN, UserRole.LEADER])).toBe(
      "ADMIN_LEADER",
    );
    expect(audienceOfRoles([UserRole.ADMIN, UserRole.MEMBER])).toBe(
      "ADMIN_MEMBER",
    );
    expect(audienceOfRoles([UserRole.LEADER, UserRole.MEMBER])).toBe(
      "LEADER_MEMBER",
    );
    expect(
      audienceOfRoles([UserRole.ADMIN, UserRole.LEADER, UserRole.MEMBER]),
    ).toBe("ALL_ROLES");
  });

  it("stores target roles without exposing them as free metadata", () => {
    const flag = buildFlag(["leader"]);

    expect(targetRolesOf(flag)).toEqual([UserRole.LEADER]);
    expect(publicMetadataOf(flag)).toEqual({ rollout: 100 });
  });

  it("requires a matching authenticated role for a targeted flag", () => {
    const flag = buildFlag(["leader", "member"]);

    expect(isTargetedForRole(flag, null)).toBe(false);
    expect(isTargetedForRole(flag, UserRole.LEADER)).toBe(true);
    expect(isTargetedForRole(flag, UserRole.ADMIN)).toBe(false);
  });

  it("never enables a disabled flag", () => {
    expect(isTargetedForRole(buildFlag([], false), UserRole.ADMIN)).toBe(false);
  });
});

describe("catalogDefaultFor", () => {
  it("flag ausente do banco vale o padrão do catálogo, respeitando o público", () => {
    expect(catalogDefaultFor("contact_form")).toBe(true);
    expect(catalogDefaultFor("member_area")).toBe(false);
    expect(catalogDefaultFor("member_area", "member")).toBe(true);
    expect(catalogDefaultFor("ministry_fair_integration", "member")).toBe(false);
    expect(catalogDefaultFor("ministry_fair_integration", "leader")).toBe(true);
  });

  it("flag desligada de fábrica e chave fora do catálogo ficam desligadas", () => {
    expect(catalogDefaultFor("content_studio", "admin")).toBe(false);
    expect(catalogDefaultFor("nao_existe", "admin")).toBe(false);
  });
});

describe("isPlaceholderFlagDescription", () => {
  it("reconhece vazia e genérica antiga, mas não descrição própria", () => {
    expect(isPlaceholderFlagDescription(null)).toBe(true);
    expect(isPlaceholderFlagDescription("  ")).toBe(true);
    expect(
      isPlaceholderFlagDescription("Interruptor do recurso: pagelas."),
    ).toBe(true);
    expect(isPlaceholderFlagDescription("Texto escrito pelo admin.")).toBe(
      false,
    );
  });
});
