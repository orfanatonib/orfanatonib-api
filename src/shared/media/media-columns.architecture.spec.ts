import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Teste de arquitetura (plano 02, T2.2): `expectNoOrphans` do E2E só enxerga os objetos do bucket que
 * estão referenciados pelas colunas listadas em `MEDIA_URL_COLUMNS` / `MEDIA_KEY_COLUMNS`
 * (`orfanatonib-app/e2e/live/support/s3.ts`). Uma coluna nova de mídia fora dessas listas faria o E2E
 * acusar órfão falso (ou, pior, deixar passar um órfão real). Este teste varre as entidades e exige que
 * toda coluna com cara de mídia esteja numa das listas ou numa exceção explícita e justificada.
 *
 * O repositório do app é irmão deste; sem ele (CI só da API) a comparação não tem o que ler e o teste
 * se declara ignorado em vez de passar em falso.
 */
const SRC = join(__dirname, "..", "..");
const APP_S3_HELPER = join(
  SRC,
  "..",
  "..",
  "orfanatonib-app",
  "e2e",
  "live",
  "support",
  "s3.ts",
);

interface Column {
  table: string;
  column: string;
}

/** Colunas com cara de mídia que NÃO são referência a objeto do bucket (decisão explícita). */
const NOT_A_REFERENCE: ReadonlyArray<Column & { why: string }> = [
  {
    table: "media_items",
    column: "storageKey",
    why: "derivada de media_items.url (mesma chave)",
  },
  {
    table: "media_cleanup_queue",
    column: "storageKey",
    why: "fila de objetos A APAGAR; não é referência viva",
  },
];

const MEDIA_NAME =
  /(url|image|cover|photo|logo|avatar|thumb|storagekey|s3key)/i;

const entityFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "node_modules" ? [] : entityFiles(full);
    return entry.name.endsWith(".entity.ts") ? [full] : [];
  });

function tableOf(source: string): string | null {
  const match =
    /@Entity\(\s*['"]([^'"]+)['"]/.exec(source) ??
    /@Entity\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/.exec(source);
  return match ? match[1] : null;
}

/** Colunas `@Column` cujo nome da propriedade parece mídia; o nome físico é `name:` ou a própria propriedade. */
function mediaLikeColumns(source: string, table: string): Column[] {
  const found: Column[] = [];
  const re = /@Column\(([\s\S]*?)\)\s*\n\s*(?:readonly\s+)?(\w+)[!?]?\s*:/g;
  for (const match of source.matchAll(re)) {
    const [, options, property] = match;
    if (!MEDIA_NAME.test(property)) continue;
    const named = /name:\s*['"]([^'"]+)['"]/.exec(options);
    found.push({ table, column: named ? named[1] : property });
  }
  return found;
}

function parseList(source: string, exportName: string): Column[] {
  const block = new RegExp(
    `export const ${exportName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`,
  ).exec(source);
  if (!block) throw new Error(`${exportName} não encontrado em s3.ts`);
  return [
    ...block[1].matchAll(/table:\s*"([^"]+)",\s*column:\s*"([^"]+)"/g),
  ].map((m) => ({
    table: m[1],
    column: m[2],
  }));
}

const key = (c: Column): string => `${c.table}.${c.column}`;
const appPresent = existsSync(APP_S3_HELPER);
const suite = appPresent ? describe : describe.skip;

describe("colunas de mídia: varredura das entidades (independe do app)", () => {
  const columns = entityFiles(SRC).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const table = tableOf(source);
    return table ? mediaLikeColumns(source, table) : [];
  });

  it("encontra as colunas de mídia conhecidas (a varredura funciona)", () => {
    const keys = columns.map(key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "media_items.url",
        "routes.image",
        "content_packages.coverImageUrl",
        "content_assets.storageKey",
        "lessons.cover_image_url",
      ]),
    );
  });

  it("toda exceção de NOT_A_REFERENCE ainda existe nas entidades", () => {
    const keys = new Set(columns.map(key));
    expect(NOT_A_REFERENCE.filter((e) => !keys.has(key(e))).map(key)).toEqual(
      [],
    );
  });
});

suite(
  "colunas de mídia × helper de S3 do E2E (MEDIA_URL_COLUMNS / MEDIA_KEY_COLUMNS)",
  () => {
    const helper = appPresent ? readFileSync(APP_S3_HELPER, "utf8") : "";
    const listed = appPresent
      ? [
          ...parseList(helper, "MEDIA_URL_COLUMNS"),
          ...parseList(helper, "MEDIA_KEY_COLUMNS"),
        ]
      : [];
    const columns = entityFiles(SRC).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const table = tableOf(source);
      return table ? mediaLikeColumns(source, table) : [];
    });
    const listedKeys = new Set(listed.map(key));
    const ignored = new Set(NOT_A_REFERENCE.map(key));

    it("[media-upload.columns#helper-igual-entidades] toda coluna de mídia das entidades está nas listas do helper (ou é exceção explícita)", () => {
      const missing = columns
        .filter((c) => !listedKeys.has(key(c)) && !ignored.has(key(c)))
        .map(key);
      expect(missing).toEqual([]);
    });

    it("nenhuma coluna das listas do helper deixou de existir nas entidades", () => {
      const real = new Set(columns.map(key));
      expect(listed.filter((c) => !real.has(key(c))).map(key)).toEqual([]);
    });

    it("MEDIA_KEY_COLUMNS só traz colunas de chave e MEDIA_URL_COLUMNS só colunas de URL", () => {
      const urlCols = parseList(helper, "MEDIA_URL_COLUMNS");
      const keyCols = parseList(helper, "MEDIA_KEY_COLUMNS");
      expect(
        keyCols.filter((c) => !/(storagekey|s3key)$/i.test(c.column)).map(key),
      ).toEqual([]);
      expect(
        urlCols.filter((c) => /(storagekey|s3key)$/i.test(c.column)).map(key),
      ).toEqual([]);
    });
  },
);
