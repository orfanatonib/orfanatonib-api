import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { MysqlQueryRunner } from "typeorm/driver/mysql/MysqlQueryRunner";

import { ResourceConflictException } from "src/common/exceptions";

import { createDatabaseOptions } from "../../../../database/database.config";
import {
  CONTENT_AUDIENCE_CATALOG,
  CONTENT_STUDIO_CATALOG_VERSION,
} from "../constants";
import { ContentPublicationEntity } from "../entities/content-publication.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPackagesRepository } from "./content-packages.repository";
import { ContentPublicationRepository } from "./content-publication.repository";
import { ContentReviewRepository } from "./content-review.repository";
import { ContentStageContentRepository } from "./content-stage-content.repository";

/**
 * Atomicidade da publicação contra o MySQL REAL: `begin`, `complete` e `fail` são cada uma UMA transação.
 * Falha injetada no driver (1ª escrita ou COMMIT): o estado do material e das publicações tem que ficar IDÊNTICO.
 * Sem MySQL configurado a suíte é pulada.
 */
const hasDatabase = Boolean(process.env.DB_HOST && process.env.DB_NAME);
const suite = hasDatabase ? describe : describe.skip;

const INJECTED = "FALHA_INJETADA_NO_TESTE";
const USER_ID = randomUUID();
const PAGE_ID = randomUUID();
const WRITE = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;

let dataSource: DataSource;
let packages: ContentPackagesRepository;
let stageContent: ContentStageContentRepository;
let review: ContentReviewRepository;
let publications: ContentPublicationRepository;
const createdPackageIds: string[] = [];

async function withFault<T>(
  fault: "first-write" | "commit",
  run: () => Promise<T>,
): Promise<Error | undefined> {
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
    if (this.isTransactionActive && fault === "commit" && /^\s*COMMIT\b/i.test(query))
      return Promise.reject(new Error(INJECTED));
    return (original as (...args: unknown[]) => Promise<unknown>).call(
      this,
      query,
      ...rest,
    ) as never;
  } as typeof original;
  try {
    await run();
    return undefined;
  } catch (error) {
    return error as Error;
  } finally {
    MysqlQueryRunner.prototype.query = original;
  }
}

async function state(packageId: string): Promise<unknown> {
  return {
    status: (
      (await dataSource.query("SELECT status, lockVersion FROM content_packages WHERE id = ?", [packageId])) as unknown[]
    )[0],
    publications: await dataSource.query(
      "SELECT id, status, errorCode, visit_material_page_id, publishedAt FROM content_publications WHERE package_id = ? ORDER BY id",
      [packageId],
    ),
  };
}

const packageStatus = async (packageId: string): Promise<string> =>
  (
    (await dataSource.query("SELECT status FROM content_packages WHERE id = ?", [packageId])) as Array<{ status: string }>
  )[0].status;

async function readyPackage(): Promise<string> {
  const created = await packages.createWithCatalog({
    theme: `it-pub-${randomUUID().slice(0, 8)}`,
    biblicalReferences: "Salmos 23",
    canonicalObjective: "Confiar em Deus",
    canonicalNotes: null,
    templateCatalogVersion: CONTENT_STUDIO_CATALOG_VERSION,
    createdById: USER_ID,
    audiences: CONTENT_AUDIENCE_CATALOG.filter((item) => item.audience === ContentAudience.CHILD),
  });
  createdPackageIds.push(created.id);
  const stages = (created.tracks ?? [])
    .flatMap((track) => track.stages ?? [])
    .sort((a, b) => a.position - b.position);
  for (const stage of stages) {
    await stageContent.saveStageContent({
      packageId: created.id,
      stageId: stage.id,
      structuredContent: { title: "Texto" },
      contentChecksum: randomUUID().replace(/-/g, "").padEnd(64, "0").slice(0, 64),
      templateVersion: CONTENT_STUDIO_CATALOG_VERSION,
      generationSnapshot: null,
      createdById: USER_ID,
    });
    await stageContent.completeProductionStage({ packageId: created.id, stageId: stage.id });
  }
  await review.submitPackageForReview(created.id);
  for (const stage of stages) {
    const [row] = (await dataSource.query(
      "SELECT s.lockVersion AS lockVersion, s.current_version_id AS versionId, v.contentChecksum AS checksum FROM content_stages s JOIN content_versions v ON v.id = s.current_version_id WHERE s.id = ?",
      [stage.id],
    )) as Array<{ lockVersion: number; versionId: string; checksum: string }>;
    await review.approveReviewStage({
      packageId: created.id,
      stageId: stage.id,
      versionId: row.versionId,
      lockVersion: row.lockVersion,
      contentChecksum: row.checksum,
      reviewerId: USER_ID,
    });
  }
  expect(await packageStatus(created.id)).toBe(ContentPackageStatus.READY_FOR_PUBLICATION);
  return created.id;
}

suite("Atomicidade da publicação (MySQL real)", () => {
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
    stageContent = new ContentStageContentRepository(dataSource);
    review = new ContentReviewRepository(dataSource);
    publications = new ContentPublicationRepository(
      dataSource,
      dataSource.getRepository(ContentPublicationEntity),
    );
  });

  afterAll(async () => {
    for (const id of createdPackageIds) {
      await dataSource.query("DELETE FROM content_publications WHERE package_id = ?", [id]);
      await dataSource.query("DELETE FROM content_review_comments WHERE package_id = ?", [id]);
      await dataSource.query("DELETE FROM content_review_decisions WHERE package_id = ?", [id]);
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
      await dataSource.query("DELETE FROM content_tracks WHERE package_id = ?", [id]);
      await dataSource.query("DELETE FROM content_packages WHERE id = ?", [id]);
    }
    await dataSource.destroy();
  });

  it("caminho feliz: begin => PUBLISHING; complete => PUBLISHED com a página", async () => {
    const id = await readyPackage();
    const begun = await publications.begin(id, `k-${randomUUID()}`, USER_ID);
    expect(await packageStatus(id)).toBe(ContentPackageStatus.PUBLISHING);
    expect(begun.snapshot.tracks).toHaveLength(1);
    expect(Object.keys(begun.publication.approvedVersions).length).toBeGreaterThan(0);

    const done = await publications.complete(begun.publication.id, id, PAGE_ID);
    expect(done.status).toBe(ContentPublicationStatus.PUBLISHED);
    expect(done.visitMaterialPageId).toBe(PAGE_ID);
    expect(await packageStatus(id)).toBe(ContentPackageStatus.PUBLISHED);
  });

  it("begin com a 1ª escrita falhando: material segue READY e nenhuma publicação nasce", async () => {
    const id = await readyPackage();
    const before = await state(id);
    const error = await withFault("first-write", () => publications.begin(id, `k-${randomUUID()}`, USER_ID));
    expect(error?.message).toContain(INJECTED);
    expect(await state(id)).toEqual(before);
  });

  it("begin com falha no COMMIT: tudo desfeito", async () => {
    const id = await readyPackage();
    const before = await state(id);
    const error = await withFault("commit", () => publications.begin(id, `k-${randomUUID()}`, USER_ID));
    expect(error?.message).toContain(INJECTED);
    expect(await state(id)).toEqual(before);
  });

  it("chave repetida: o INSERT falha e o status do material é desfeito (continua READY)", async () => {
    const id = await readyPackage();
    const other = await readyPackage();
    const key = `k-${randomUUID()}`;
    await publications.begin(other, key, USER_ID);
    const before = await state(id);
    await expect(publications.begin(id, key, USER_ID)).rejects.toBeDefined();
    expect(await state(id)).toEqual(before);
  });

  it("begin fora de READY_FOR_PUBLICATION é 409 e não escreve nada", async () => {
    const id = await readyPackage();
    await publications.begin(id, `k-${randomUUID()}`, USER_ID);
    const before = await state(id);
    await expect(publications.begin(id, `k-${randomUUID()}`, USER_ID)).rejects.toBeInstanceOf(
      ResourceConflictException,
    );
    expect(await state(id)).toEqual(before);
  });

  it("complete com falha no COMMIT: continua PUBLISHING / publicação PUBLISHING", async () => {
    const id = await readyPackage();
    const begun = await publications.begin(id, `k-${randomUUID()}`, USER_ID);
    const before = await state(id);
    const error = await withFault("commit", () => publications.complete(begun.publication.id, id, PAGE_ID));
    expect(error?.message).toContain(INJECTED);
    expect(await state(id)).toEqual(before);
  });

  it("fail: publicação FAILED e o material volta a READY_FOR_PUBLICATION (e pode publicar de novo)", async () => {
    const id = await readyPackage();
    const begun = await publications.begin(id, `k-${randomUUID()}`, USER_ID);
    const failed = await publications.fail(begun.publication.id, id, ContentPublicationErrorCode.PAGE_CREATION_FAILED);
    expect(failed.status).toBe(ContentPublicationStatus.FAILED);
    expect(await packageStatus(id)).toBe(ContentPackageStatus.READY_FOR_PUBLICATION);
    await expect(publications.begin(id, `k-${randomUUID()}`, USER_ID)).resolves.toBeDefined();
  });

  it("fail com falha no COMMIT: nada muda", async () => {
    const id = await readyPackage();
    const begun = await publications.begin(id, `k-${randomUUID()}`, USER_ID);
    const before = await state(id);
    const error = await withFault("commit", () =>
      publications.fail(begun.publication.id, id, ContentPublicationErrorCode.INTERRUPTED),
    );
    expect(error?.message).toContain(INJECTED);
    expect(await state(id)).toEqual(before);
  });
});
