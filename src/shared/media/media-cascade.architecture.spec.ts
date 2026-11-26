import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Teste de arquitetura (plano 05, T4.2): todo serviço de exclusão ou trata a mídia
 * do dono (cascata: linhas antes dos objetos, objetos só depois do commit) ou está
 * EXPLICITAMENTE na lista dos que não têm mídia. Um `delete-*` novo força a decisão —
 * esquecer a cascata deixaria objetos órfãos no bucket.
 */
const SRC = join(__dirname, "..", "..");

/** Donos SEM mídia no bucket (decisão explícita; revisar ao adicionar upload ao módulo). */
const NO_MEDIA_OWNERS: ReadonlySet<string> = new Set([
  "communication/comment/services/delete-comment.service.ts",
  "communication/contact/services/delete-contact.service.ts",
  "communication/feedback/services/delete-site-feedback.service.ts",
  "content/informative/services/delete-informative.service.ts",
  "content/page/feed-celebration/services/delete-celebration.service.ts", // celebração é um clique, sem arquivo
  "content/page/feed-photo-comment/services/delete-feed-comment.service.ts", // comentário é só texto
  "core/feature-flags/services/delete-feature-flag.service.ts",
  "core/log-records/services/delete-log-records.service.ts",
  "shelter/leader-profile/services/delete-leader-profile.service.ts",
  "shelter/member-profile/services/delete-member-profile.service.ts",
  "shelter/pagela/services/delete-pagela.service.ts",
  "shelter/schedule/services/delete-shelter-schedule.service.ts", // apaga os eventos (que cuidam da própria mídia)
  "shelter/sheltered/services/delete-sheltered.service.ts",
  "shelter/team/services/delete-team.service.ts",
  "shelter/visit-report/services/delete-visit-report.service.ts",
  // Estúdio (outra sessão): decisão própria, fora deste teste.
  "content/ai-lessons/services/delete-lesson.service.ts",
]);

const MEDIA_HANDLING =
  /Media(Service|ItemProcessor|StorageService)|mediaService|mediaStorage|deleteAfterCommit|removeMediaItems/;

const deleteServices = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return deleteServices(full);
    return /^delete-.*\.service\.ts$/.test(entry.name) ? [full] : [];
  });

describe("cascata de mídia na exclusão do dono", () => {
  const files = deleteServices(SRC).map((f) => relative(SRC, f));

  it("encontra os serviços de exclusão", () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it("[media-upload.cascade#delete-trata-midia] todo delete-*.service trata a mídia ou está na lista de donos sem mídia", () => {
    const offenders = files.filter(
      (file) =>
        !NO_MEDIA_OWNERS.has(file) &&
        !MEDIA_HANDLING.test(readFileSync(join(SRC, file), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("a lista de donos sem mídia não tem entrada obsoleta (arquivo removido ou que passou a tratar mídia)", () => {
    const stale = [...NO_MEDIA_OWNERS].filter(
      (file) =>
        !files.includes(file) ||
        (file.startsWith("content/ai-lessons") === false &&
          MEDIA_HANDLING.test(readFileSync(join(SRC, file), "utf8"))),
    );
    expect(stale).toEqual([]);
  });
});
