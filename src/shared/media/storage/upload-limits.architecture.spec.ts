import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Trava de arquitetura (plano 05, T3.4): todo interceptor de upload do código de produção recebe as opções
 * com `limits` (`*_UPLOAD_OPTIONS`) — sem elas o Multer aceitaria qualquer tamanho em memória.
 */
const SRC = join(__dirname, "..", "..", "..");
const INTERCEPTOR_CALL =
  /\b(FileInterceptor|FilesInterceptor|AnyFilesInterceptor|FileFieldsInterceptor)\(([^)]*)\)/g;

const productionFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return productionFiles(full);
    return /\.ts$/.test(entry.name) && !/\.spec\.ts$/.test(entry.name)
      ? [full]
      : [];
  });

describe("limites em todo handler de upload", () => {
  const calls = productionFiles(SRC).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return [...text.matchAll(INTERCEPTOR_CALL)].map((m) => ({
      file: relative(SRC, file),
      name: m[1],
      args: m[2],
    }));
  });

  it("encontra os handlers de upload", () => {
    expect(calls.length).toBeGreaterThanOrEqual(20);
  });

  it("[media-upload.limits#todo-handler-tem-limits] nenhum interceptor de upload fica sem `limits`", () => {
    const offenders = calls.filter(
      (call) => !/(OPTIONS|limits)/.test(call.args),
    );
    expect(offenders).toEqual([]);
  });
});
