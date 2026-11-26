import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { MysqlQueryRunner } from "typeorm/driver/mysql/MysqlQueryRunner";

import { createDatabaseOptions } from "../../../../database/database.config";
import {
  CONTENT_AUDIENCE_CATALOG,
  CONTENT_STUDIO_CATALOG_VERSION,
} from "../constants";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { ContentGenerationRepository } from "./content-generation.repository";
import { ContentPackagesRepository } from "./content-packages.repository";
import { ContentReviewRepository } from "./content-review.repository";
import { ContentStageContentRepository } from "./content-stage-content.repository";

/**
 * Atomicidade de cada rota de escrita do Estúdio, contra o MySQL REAL (o do ambiente de teste).
 *
 * A falha é injetada no driver: a N-ésima escrita (INSERT/UPDATE/DELETE) feita DENTRO de uma transação lança erro.
 *   - "falha do colaborador": a 1ª escrita falha (o banco/colaborador cai logo no começo);
 *   - "rollback de transação": todas as escritas acontecem e o COMMIT falha (tudo precisa ser desfeito).
 * Nos dois casos o estado do material no banco tem que ficar IDÊNTICO ao de antes. Sem MySQL configurado
 * (`DB_HOST`/`DB_NAME`), a suíte é pulada.
 */
const hasDatabase = Boolean(process.env.DB_HOST && process.env.DB_NAME);
const suite = hasDatabase ? describe : describe.skip;

const INJECTED = "FALHA_INJETADA_NO_TESTE";
const USER_ID = randomUUID();
const WRITE = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;

let dataSource: DataSource;
let packages: ContentPackagesRepository;
let generation: ContentGenerationRepository;
let stageContent: ContentStageContentRepository;
let review: ContentReviewRepository;
const createdPackageIds: string[] = [];
const createdThemes: string[] = [];

/**
 * Injeta a falha no driver, só dentro de transação:
 *  - `first-write`: a 1ª escrita (INSERT/UPDATE/DELETE) lança erro;
 *  - `commit`: todas as escritas acontecem e o COMMIT lança erro (o banco precisa desfazer tudo).
 */
async function withFault<T>(
  fault: "first-write" | "commit",
  run: () => Promise<T>,
): Promise<{ writes: number; result?: T; error?: Error }> {
  const original = MysqlQueryRunner.prototype.query;
  let writes = 0;
  MysqlQueryRunner.prototype.query = function (
    this: MysqlQueryRunner,
    query: string,
    ...rest: unknown[]
  ) {
    if (this.isTransactionActive && WRITE.test(query)) {
      writes += 1;
      if (fault === "first-write" && writes === 1)
        return Promise.reject(new Error(INJECTED));
    }
    if (
      this.isTransactionActive &&
      fault === "commit" &&
      /^\s*COMMIT\b/i.test(query)
    )
      return Promise.reject(new Error(INJECTED));
    return (original as (...args: unknown[]) => Promise<unknown>).call(
      this,
      query,
      ...rest,
    ) as never;
  } as typeof original;
  try {
    const result = await run();
    return { writes, result };
  } catch (error) {
    return { writes, error: error as Error };
  } finally {
    MysqlQueryRunner.prototype.query = original;
  }
}

/** Tudo o que o material tem no banco, para comparar antes × depois. */
async function snapshot(packageId: string): Promise<unknown> {
  const q = (sql: string) =>
    dataSource.query(sql, [packageId]) as Promise<unknown[]>;
  return {
    pkg: await q("SELECT * FROM content_packages WHERE id = ?"),
    tracks: await q(
      "SELECT * FROM content_tracks WHERE package_id = ? ORDER BY id",
    ),
    stages: await q(
      "SELECT s.* FROM content_stages s JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ? ORDER BY s.id",
    ),
    versions: await q(
      "SELECT v.* FROM content_versions v JOIN content_stages s ON s.id = v.stage_id JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ? ORDER BY v.id",
    ),
    jobs: await q(
      "SELECT j.* FROM content_generation_jobs j JOIN content_stages s ON s.id = j.stage_id JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ? ORDER BY j.id",
    ),
    decisions: await q(
      "SELECT d.* FROM content_review_decisions d WHERE d.package_id = ? ORDER BY d.id",
    ),
    comments: await q(
      "SELECT c.* FROM content_review_comments c WHERE c.package_id = ? ORDER BY c.id",
    ),
  };
}

async function newPackage(): Promise<{
  id: string;
  stages: Array<{ id: string; position: number }>;
}> {
  const created = await packages.createWithCatalog({
    theme: `it-${randomUUID().slice(0, 8)}`,
    biblicalReferences: "Salmos 23",
    canonicalObjective: "Confiar em Deus",
    canonicalNotes: null,
    templateCatalogVersion: CONTENT_STUDIO_CATALOG_VERSION,
    createdById: USER_ID,
    audiences: CONTENT_AUDIENCE_CATALOG.filter(
      (item) => item.audience === ContentAudience.CHILD,
    ),
  });
  createdPackageIds.push(created.id);
  const stages = (created.tracks ?? [])
    .flatMap((track) => track.stages ?? [])
    .map((stage) => ({ id: stage.id, position: stage.position }));
  return {
    id: created.id,
    stages: stages.sort((a, b) => a.position - b.position),
  };
}

const save = (packageId: string, stageId: string, title = "Texto") =>
  stageContent.saveStageContent({
    packageId,
    stageId,
    structuredContent: { title },
    contentChecksum: randomUUID()
      .replace(/-/g, "")
      .padEnd(64, "0")
      .slice(0, 64),
    templateVersion: CONTENT_STUDIO_CATALOG_VERSION,
    generationSnapshot: null,
    createdById: USER_ID,
  });

async function packageWithContent() {
  const pkg = await newPackage();
  await save(pkg.id, pkg.stages[0].id);
  return pkg;
}

async function packageInReview() {
  const pkg = await newPackage();
  for (const stage of pkg.stages) {
    await save(pkg.id, stage.id);
    await stageContent.completeProductionStage({
      packageId: pkg.id,
      stageId: stage.id,
    });
  }
  await review.submitPackageForReview(pkg.id);
  return pkg;
}

async function reviewInput(packageId: string, stageId: string) {
  const [row] = (await dataSource.query(
    "SELECT s.lockVersion AS lockVersion, s.current_version_id AS versionId, v.contentChecksum AS checksum FROM content_stages s JOIN content_versions v ON v.id = s.current_version_id WHERE s.id = ?",
    [stageId],
  )) as Array<{ lockVersion: number; versionId: string; checksum: string }>;
  return {
    packageId,
    stageId,
    versionId: row.versionId,
    lockVersion: row.lockVersion,
    contentChecksum: row.checksum,
  };
}

/** Uma rota de escrita: como montar o material no estado certo e como executar a operação. */
interface WriteScenario {
  id: string;
  name: string;
  /** Prepara um material novo no estado em que a operação é válida; `run` executa a operação sobre ele. */
  prepare: () => Promise<{
    packageId: string | null;
    run: () => Promise<unknown>;
  }>;
  /** Para a criação o "estado" é o conjunto de materiais com aquele tema. */
  snapshotOf?: (prepared: {
    packageId: string | null;
    theme?: string;
  }) => Promise<unknown>;
}

const SCENARIOS: WriteScenario[] = [
  {
    id: "content-studio.post.content-studio-packages",
    name: "criar material",
    prepare: async () => {
      const theme = `it-create-${randomUUID().slice(0, 8)}`;
      createdThemes.push(theme);
      return {
        packageId: theme, // reaproveitado como chave de busca em `snapshotOf`
        run: () =>
          packages.createWithCatalog({
            theme,
            biblicalReferences: "Salmos 23",
            canonicalObjective: "x",
            canonicalNotes: null,
            templateCatalogVersion: CONTENT_STUDIO_CATALOG_VERSION,
            createdById: USER_ID,
            audiences: CONTENT_AUDIENCE_CATALOG,
          }),
      };
    },
    snapshotOf: async ({ packageId: theme }) => ({
      packages: await dataSource.query(
        "SELECT id FROM content_packages WHERE theme = ?",
        [theme],
      ),
      tracks: await dataSource.query(
        "SELECT t.id FROM content_tracks t JOIN content_packages p ON p.id = t.package_id WHERE p.theme = ?",
        [theme],
      ),
      stages: await dataSource.query(
        "SELECT s.id FROM content_stages s JOIN content_tracks t ON t.id = s.track_id JOIN content_packages p ON p.id = t.package_id WHERE p.theme = ?",
        [theme],
      ),
    }),
  },
  {
    id: "content-studio.patch.content-studio-packages-packageid-stages-stageid-content",
    name: "salvar conteúdo da etapa",
    prepare: async () => {
      const pkg = await newPackage();
      await save(pkg.id, pkg.stages[0].id, "v1");
      return {
        packageId: pkg.id,
        run: () => save(pkg.id, pkg.stages[0].id, "v2"),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-archive",
    name: "arquivar material",
    prepare: async () => {
      const pkg = await packageWithContent();
      return { packageId: pkg.id, run: () => packages.archivePackage(pkg.id) };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-stages-stageid-complete-production",
    name: "concluir produção da etapa",
    prepare: async () => {
      const pkg = await packageWithContent();
      return {
        packageId: pkg.id,
        run: () =>
          stageContent.completeProductionStage({
            packageId: pkg.id,
            stageId: pkg.stages[0].id,
          }),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-stages-stageid-generations",
    name: "pedir geração",
    prepare: async () => {
      const pkg = await newPackage();
      return {
        packageId: pkg.id,
        run: () =>
          generation.requestStageGeneration({
            packageId: pkg.id,
            stageId: pkg.stages[0].id,
            capability: AiGenerationCapability.TEXT_STRUCTURED,
            idempotencyKey: `it-${randomUUID()}`,
            requestedById: USER_ID,
          }),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-submit-review",
    name: "enviar para revisão",
    prepare: async () => {
      const pkg = await newPackage();
      for (const stage of pkg.stages) {
        await save(pkg.id, stage.id);
        await stageContent.completeProductionStage({
          packageId: pkg.id,
          stageId: stage.id,
        });
      }
      return {
        packageId: pkg.id,
        run: () => review.submitPackageForReview(pkg.id),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-stages-stageid-approve",
    name: "aprovar etapa",
    prepare: async () => {
      const pkg = await packageInReview();
      const input = await reviewInput(pkg.id, pkg.stages[0].id);
      return {
        packageId: pkg.id,
        run: () => review.approveReviewStage({ ...input, reviewerId: USER_ID }),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-stages-stageid-request-changes",
    name: "pedir ajustes",
    prepare: async () => {
      const pkg = await packageInReview();
      const input = await reviewInput(pkg.id, pkg.stages[0].id);
      return {
        packageId: pkg.id,
        run: () =>
          review.requestStageChanges({
            ...input,
            message: "Ajustar a linguagem",
            blockKey: null,
            authorId: USER_ID,
          }),
      };
    },
  },
  {
    id: "content-studio.post.content-studio-packages-packageid-review-comments-commentid-resolve",
    name: "resolver comentário",
    prepare: async () => {
      const pkg = await packageInReview();
      const input = await reviewInput(pkg.id, pkg.stages[0].id);
      await review.requestStageChanges({
        ...input,
        message: "Ajustar",
        blockKey: null,
        authorId: USER_ID,
      });
      const [comment] = (await dataSource.query(
        "SELECT id FROM content_review_comments WHERE package_id = ?",
        [pkg.id],
      )) as Array<{ id: string }>;
      return {
        packageId: pkg.id,
        run: () =>
          review.resolveReviewComment(pkg.id, comment.id, "Ajustado", USER_ID),
      };
    },
  },
];

suite(
  "atomicidade das rotas de escrita do Estúdio (MySQL real, falha injetada)",
  () => {
    beforeAll(async () => {
      dataSource = new DataSource(
        createDatabaseOptions({
          DB_HOST: process.env.DB_HOST,
          DB_PORT: process.env.DB_PORT,
          DB_USERNAME: process.env.DB_USERNAME,
          DB_PASSWORD: process.env.DB_PASSWORD,
          DB_NAME: process.env.DB_NAME,
        }),
      );
      await dataSource.initialize();
      packages = new ContentPackagesRepository(
        dataSource,
        dataSource.getRepository("ContentPackageEntity") as never,
      );
      generation = new ContentGenerationRepository(dataSource);
      stageContent = new ContentStageContentRepository(dataSource);
      review = new ContentReviewRepository(dataSource);
    });

    afterAll(async () => {
      // Os materiais do teste não ficam no banco de desenvolvimento (inclusive o de uma criação que não deveria ter persistido).
      for (const theme of createdThemes) {
        const rows = (await dataSource.query(
          "SELECT id FROM content_packages WHERE theme = ?",
          [theme],
        )) as Array<{ id: string }>;
        createdPackageIds.push(...rows.map((row) => row.id));
      }
      for (const id of createdPackageIds) {
        await dataSource.query(
          "DELETE FROM content_review_comments WHERE package_id = ?",
          [id],
        );
        await dataSource.query(
          "DELETE FROM content_review_decisions WHERE package_id = ?",
          [id],
        );
        await dataSource.query(
          "DELETE v FROM content_versions v JOIN content_stages s ON s.id = v.stage_id JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ?",
          [id],
        );
        await dataSource.query(
          "DELETE j FROM content_generation_jobs j JOIN content_stages s ON s.id = j.stage_id JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ?",
          [id],
        );
        await dataSource.query(
          "UPDATE content_stages s JOIN content_tracks t ON t.id = s.track_id SET s.current_version_id = NULL WHERE t.package_id = ?",
          [id],
        );
        await dataSource.query(
          "DELETE s FROM content_stages s JOIN content_tracks t ON t.id = s.track_id WHERE t.package_id = ?",
          [id],
        );
        await dataSource.query(
          "DELETE FROM content_tracks WHERE package_id = ?",
          [id],
        );
        await dataSource.query("DELETE FROM content_packages WHERE id = ?", [
          id,
        ]);
      }
      await dataSource.destroy();
    });

    const snapshotOf = (
      scenario: WriteScenario,
      prepared: { packageId: string | null },
    ) =>
      scenario.snapshotOf
        ? scenario.snapshotOf(prepared)
        : snapshot(prepared.packageId as string);

    /** A 1ª escrita da transação falha: nada pode ter mudado no banco. */
    const colaboradorFalha = (title: string, scenario: WriteScenario) =>
      it(`${title} ${scenario.name}: a 1ª escrita falha ⇒ nada muda no banco`, async () => {
        const prepared = await scenario.prepare();
        const before = await snapshotOf(scenario, prepared);
        const outcome = await withFault("first-write", prepared.run);
        expect(outcome.error?.message).toContain(INJECTED);
        expect(await snapshotOf(scenario, prepared)).toEqual(before);
      });

    /** Todas as escritas acontecem e o COMMIT falha: o banco precisa desfazer tudo. */
    const commitFalha = (title: string, scenario: WriteScenario) =>
      it(`${title} ${scenario.name}: o COMMIT falha depois de todas as escritas ⇒ o banco desfaz tudo`, async () => {
        const prepared = await scenario.prepare();
        const before = await snapshotOf(scenario, prepared);
        const outcome = await withFault("commit", prepared.run);
        expect(outcome.error?.message).toContain(INJECTED);
        // Houve escritas dentro da transação (senão o teste não provaria rollback algum)...
        expect(outcome.writes).toBeGreaterThanOrEqual(1);
        // ...e nenhuma delas ficou.
        expect(await snapshotOf(scenario, prepared)).toEqual(before);
      });

    // Títulos literais: o gate de cobertura (`check-scenario-coverage.mjs`) procura `[<id>#<caso>]` no texto.
    colaboradorFalha(
      "[content-studio.post.content-studio-packages#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[0],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages#rollback-de-transacao]",
      SCENARIOS[0],
    );
    colaboradorFalha(
      "[content-studio.patch.content-studio-packages-packageid-stages-stageid-content#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[1],
    );
    commitFalha(
      "[content-studio.patch.content-studio-packages-packageid-stages-stageid-content#rollback-de-transacao]",
      SCENARIOS[1],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-archive#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[2],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-archive#rollback-de-transacao]",
      SCENARIOS[2],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-complete-production#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[3],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-complete-production#rollback-de-transacao]",
      SCENARIOS[3],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-generations#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[4],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-generations#rollback-de-transacao]",
      SCENARIOS[4],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-submit-review#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[5],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-submit-review#rollback-de-transacao]",
      SCENARIOS[5],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-approve#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[6],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-approve#rollback-de-transacao]",
      SCENARIOS[6],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-request-changes#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[7],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-stages-stageid-request-changes#rollback-de-transacao]",
      SCENARIOS[7],
    );
    colaboradorFalha(
      "[content-studio.post.content-studio-packages-packageid-review-comments-commentid-resolve#falha-do-colaborador-sem-efeito-parcial]",
      SCENARIOS[8],
    );
    commitFalha(
      "[content-studio.post.content-studio-packages-packageid-review-comments-commentid-resolve#rollback-de-transacao]",
      SCENARIOS[8],
    );
  },
);
