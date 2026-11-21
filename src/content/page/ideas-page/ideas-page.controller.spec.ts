import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FEATURE_FLAG_KEY } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { IdeasPageController } from "./ideas-page.controller";

const proto = IdeasPageController.prototype as unknown as Record<
  string,
  (...a: never[]) => unknown
>;
const guards = (name: string): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, proto[name]) as unknown[]) ?? [];
const flag = (name: string): unknown =>
  Reflect.getMetadata(FEATURE_FLAG_KEY, proto[name]);

describe("IdeasPageController: guards e flags por handler (matriz de autorização)", () => {
  it.each(["create", "update", "remove"])(
    "%s: só admin autenticado, sob page_management E ideas_sharing",
    (name) => {
      expect(guards(name)).toEqual(
        expect.arrayContaining([
          JwtAuthGuard,
          AdminRoleGuard,
          FeatureFlagGuard,
        ]),
      );
      expect(flag(name)).toEqual([
        FeatureFlagKeys.PAGE_MANAGEMENT,
        FeatureFlagKeys.IDEAS_SHARING,
      ]);
    },
  );

  it.each(["findAll", "findOne"])(
    "%s: leitura só com sessão (qualquer perfil) sob ideas_sharing; anônimo cai no JwtAuthGuard (401)",
    (name) => {
      const g = guards(name);
      expect(g).toEqual(
        expect.arrayContaining([JwtAuthGuard, FeatureFlagGuard]),
      );
      expect(g).not.toContain(AdminRoleGuard);
      expect(flag(name)).toBe(FeatureFlagKeys.IDEAS_SHARING);
    },
  );
});
