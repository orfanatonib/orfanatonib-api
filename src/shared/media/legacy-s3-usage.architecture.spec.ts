import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Trava de arquitetura (plano 05): o caminho LEGADO (`AwsS3Service.upload/delete`) não cresce.
 * Código novo usa `MediaStorageService` (`uploadAll` + `deleteAfterCommit`); enquanto uma feature
 * não migra, ela fica nesta lista — protegida pelo `UploadScopeInterceptor` (exclusão só depois do
 * sucesso; upload sem referência removido na falha). Ao migrar uma, REMOVA-A daqui: o teste também
 * falha se a lista tiver entrada obsoleta.
 */
const SRC = join(__dirname, "..", "..");

const LEGACY_IMPORTERS: ReadonlySet<string> = new Set([
  "content/ai-lessons/services/docx-exporter.service.ts",
  "content/ai-lessons/services/lesson-asset-generation.service.ts",
  "content/document/services/create-document.service.ts",
  "content/document/services/delete-document.service.ts",
  "content/document/services/update-document.service.ts",
  "content/meditation/services/create-meditation.service.ts",
  "content/meditation/services/update-meditation.service.ts",
  "content/page/ideas-section/services/ideas-section-media.service.ts",
  "content/page/image-page/services/create-image-page.service.ts",
  "content/page/image-page/services/update-image-page-media.service.ts",
  "content/page/image-page/services/update-image-page.service.ts",
  "content/page/image-section/services/create-image-section.service.ts",
  "content/page/image-section/services/update-image-section.service.ts",
  "content/page/visit-material-page/services/append-visit-material-sections.service.ts",
  "content/page/visit-material-page/services/create-visit-material-page.service.ts",
  "content/page/visit-material-page/services/delete-visit-material-page.service.ts",
  "content/page/visit-material-page/services/visit-material-sections.service.ts",
  "content/studio/export/studio-export.service.ts",
  "content/studio/services/generate-package-cover.service.ts",
  "content/studio/services/get-stage-images.service.ts",
  "content/studio/services/process-stage-images.service.ts",
]);

const importers = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "node_modules" ? [] : importers(full);
    if (
      !entry.name.endsWith(".ts") ||
      /\.spec\.ts$|\.factory\.ts$/.test(entry.name)
    )
      return [];
    return /infrastructure\/aws\/services\/aws-s3\.service"/.test(
      readFileSync(full, "utf8"),
    )
      ? [full]
      : [];
  });

/** Infraestrutura de mídia: dona do `AwsS3Service`, não conta como feature. */
const isMediaInfrastructure = (file: string): boolean =>
  file.startsWith("infrastructure/aws/") || file.startsWith("shared/media/");

describe("uso do AwsS3Service legado", () => {
  const files = importers(SRC)
    .map((f) => relative(SRC, f))
    .filter((f) => !isMediaInfrastructure(f))
    .sort();

  it("[media-upload.legacy.architecture#sem-novos-importadores] nenhuma feature NOVA importa o AwsS3Service (use MediaStorageService)", () => {
    expect(files.filter((f) => !LEGACY_IMPORTERS.has(f))).toEqual([]);
  });

  it("[media-upload.legacy.architecture#lista-sem-obsoleta] a lista de legado não tem entrada obsoleta (arquivo migrado ou removido)", () => {
    expect([...LEGACY_IMPORTERS].filter((f) => !files.includes(f))).toEqual([]);
  });
});
