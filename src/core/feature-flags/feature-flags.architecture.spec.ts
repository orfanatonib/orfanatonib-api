import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { EmailTemplateKey } from "src/communication/notification/enums/email-template-key.enum";

import { DEFAULT_FEATURE_FLAGS } from "./constants";
import {
  emailFeatureFlagKey,
  FeatureFlagKeys,
} from "./enums/feature-flag-keys.enum";

/**
 * Teste de arquitetura das flags (planos 08/09, T4.5): TODO handler HTTP ou tem
 * `@FeatureFlag` (método ou classe) ou está, por escrito e com motivo, em
 * `CORE_UNFLAGGED`. Handler novo sem flag e sem decisão derruba o teste.
 */
const SRC = join(__dirname, "..", "..");

/** `arquivo::método` → motivo. Só entra quem tem razão para NÃO ter flag. */
const CORE_UNFLAGGED: Readonly<Record<string, string>> = {
  // Infraestrutura / saúde / identidade — nunca desligáveis
  "app.controller.ts::getHello": "raiz",
  "common/controllers/health.controller.ts::getHealth": "liveness",
  "common/controllers/health.controller.ts::getReadiness": "readiness",
  "core/auth/auth.controller.ts::login":
    "login e-mail/senha: sem login ninguém liga flag nenhuma",
  "core/auth/auth.controller.ts::refresh": "sessão",
  "core/auth/auth.controller.ts::logout": "sessão",
  "core/auth/auth.controller.ts::getMe": "sessão",
  "core/auth/auth.controller.ts::verifyEmail":
    "confirmação de e-mail de conta já criada",
  "core/auth/auth.controller.ts::resendVerification":
    "confirmação de e-mail de conta já criada",
  // O próprio painel de flags: admin, nunca atrás de flag
  "core/feature-flags/feature-flags.controller.ts::create":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::seed":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::findAll":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::stats":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::getFlagsMap":
    "mapa público das flags (o front precisa dele para decidir)",
  "core/feature-flags/feature-flags.controller.ts::check":
    "consulta de uma flag pelo próprio ator",
  "core/feature-flags/feature-flags.controller.ts::findOne":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::update":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::setEnabled":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::toggle":
    "administração de flags",
  "core/feature-flags/feature-flags.controller.ts::remove":
    "administração de flags",
  // Autoatendimento da própria conta
  "core/profile/controllers/profile.controller.ts::getMyProfile":
    "perfil próprio",
  "core/profile/controllers/profile.controller.ts::updateMyProfile":
    "perfil próprio",
  "core/user/profile.controller.ts::getOwnProfile": "perfil próprio",
  "core/user/profile.controller.ts::updateOwnProfile": "perfil próprio",
  "core/user/profile.controller.ts::changePassword": "senha própria",
  "core/user/profile.controller.ts::updateOwnImage": "foto própria",
  // Operação / suporte (admin)
  "communication/notification/preview/email-preview.controller.ts::list":
    "prévia de e-mail (admin)",
  "communication/notification/preview/email-preview.controller.ts::preview":
    "prévia de e-mail (admin)",
  "communication/notification/preview/email-preview.controller.ts::previewText":
    "prévia de e-mail (admin)",
  "shared/media/storage/media-reconciliation.controller.ts::reconcile":
    "reconciliação do bucket (admin)",
  // Rotas dinâmicas: o menu e as páginas públicas dependem delas (flag por TIPO no front)
  "infrastructure/route/route.controller.ts::findAll":
    "rotas dinâmicas (flag por tipo no front)",
  "infrastructure/route/route.controller.ts::checkOrphanRoutes":
    "manutenção (admin)",
  "infrastructure/route/route.controller.ts::cleanupOrphanRoutes":
    "manutenção (admin)",
  "infrastructure/route/route.controller.ts::findOne":
    "rotas dinâmicas (flag por tipo no front)",
  // Consultas transversais usadas por vários fluxos (seleção de abrigo, equipe, líder, membro)
};

const controllerFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith(".controller.ts") ? [full] : [];
  });

interface Handler {
  key: string;
  flagged: boolean;
}

function handlersOf(file: string): Handler[] {
  const text = readFileSync(file, "utf8");
  if (!/@Controller\(/.test(text)) return [];
  const classFlag = /^@FeatureFlag\(/m.test(text);
  const rel = relative(SRC, file);
  const out: Handler[] = [];
  for (const verb of text.matchAll(/^ {2}@(?:Get|Post|Put|Patch|Delete)\(/gm)) {
    const at = verb.index ?? 0;
    const previousEnd = text.lastIndexOf("\n  }\n", at);
    const before = text.slice(Math.max(previousEnd, 0), at);
    const signature = /\n {2}(?:async )?(\w+)\(/.exec(
      text.slice(at + verb[0].length),
    );
    if (!signature) continue;
    const after = text.slice(at, at + verb[0].length + signature.index);
    out.push({
      key: `${rel}::${signature[1]}`,
      flagged:
        classFlag ||
        before.includes("@FeatureFlag(") ||
        after.includes("@FeatureFlag("),
    });
  }
  return out;
}

describe("arquitetura das feature flags", () => {
  const handlers = controllerFiles(SRC).flatMap(handlersOf);

  it("encontra os handlers (sanidade do leitor)", () => {
    expect(handlers.length).toBeGreaterThan(200);
  });

  it("todo handler tem @FeatureFlag ou está em CORE_UNFLAGGED", () => {
    const missing = handlers
      .filter((h) => !h.flagged && !(h.key in CORE_UNFLAGGED))
      .map((h) => h.key);
    expect(missing).toEqual([]);
  });

  it("CORE_UNFLAGGED não tem entrada obsoleta (handler removido ou que ganhou flag)", () => {
    const byKey = new Map(handlers.map((h) => [h.key, h]));
    const stale = Object.keys(CORE_UNFLAGGED).filter(
      (key) => !byKey.has(key) || byKey.get(key)?.flagged,
    );
    expect(stale).toEqual([]);
  });

  it("toda flag do catálogo e todo EmailTemplateKey têm chave consistente", () => {
    const keys = new Set<string>(DEFAULT_FEATURE_FLAGS.map((flag) => flag.key));
    for (const value of Object.values(FeatureFlagKeys))
      expect(keys.has(value)).toBe(true);
    for (const template of Object.values(EmailTemplateKey))
      expect(keys.has(emailFeatureFlagKey(template))).toBe(true);
  });

  it("nenhuma chave do catálogo usa kebab-case (rollout dois passos: só `RETIRED`/`RENAMES` citam as antigas)", () => {
    const kebab = [...keysOf(DEFAULT_FEATURE_FLAGS)].filter((key) =>
      key.includes("-"),
    );
    expect(kebab).toEqual([]);
  });
});

function keysOf(flags: ReadonlyArray<{ key: string }>): Set<string> {
  return new Set(flags.map((flag) => flag.key));
}
