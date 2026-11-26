import {
  DEFAULT_FEATURE_FLAGS,
  isInternalFeatureFlag,
} from "src/core/feature-flags/constants";
import {
  emailFeatureFlagKey,
  FeatureFlagKeys,
} from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { EmailTemplateKey } from "../enums/email-template-key.enum";

/** Regra 11: cada notificação por e-mail tem flag PRÓPRIA, semeada ligada e interna. */
describe("catálogo de flags de e-mail × templates", () => {
  const catalog = new Map(
    DEFAULT_FEATURE_FLAGS.map((f) => [f.key as string, f]),
  );

  it.each(Object.values(EmailTemplateKey))(
    "%s tem flag própria semeada, ligada e escondida do mapa público",
    (templateKey) => {
      const key = emailFeatureFlagKey(templateKey);
      const flag = catalog.get(key);

      expect(flag).toBeDefined();
      expect(flag?.enabled).toBe(true);
      expect(isInternalFeatureFlag(key)).toBe(true);
    },
  );

  it("nenhum template compartilha a flag com outro nem com a chave-mestra", () => {
    const keys = Object.values(EmailTemplateKey).map(emailFeatureFlagKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain(FeatureFlagKeys.EMAIL_DELIVERY);
  });

  it("não há flag de e-mail no catálogo sem template correspondente (exceto a mestra)", () => {
    const templateFlags = new Set(
      Object.values(EmailTemplateKey).map(emailFeatureFlagKey),
    );
    const orphans = DEFAULT_FEATURE_FLAGS.map((f) => f.key as string).filter(
      (key) =>
        isInternalFeatureFlag(key) &&
        key !== (FeatureFlagKeys.EMAIL_DELIVERY as string) &&
        !templateFlags.has(key),
    );
    expect(orphans).toEqual([]);
  });
});
