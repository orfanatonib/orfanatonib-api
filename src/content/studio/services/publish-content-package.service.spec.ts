import { ResourceConflictException } from "src/common/exceptions";
import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";

import type { PublicationPackageSnapshot } from "../content-publication.types";
import { CONTENT_PUBLICATION_STALE_AFTER_MS } from "../constants/content-publication.constants";
import { ContentPublicationEntity } from "../entities/content-publication.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationTargetType } from "../enums/content-publication-target-type.enum";
import { PublishContentPackageService } from "./publish-content-package.service";

const PACKAGE_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const KEY = "key-1";

const snapshot: PublicationPackageSnapshot = {
  packageId: PACKAGE_ID,
  theme: "Esperança",
  biblicalReferences: "Salmos 23",
  canonicalObjective: "Compreender o cuidado de Deus",
  tracks: [
    {
      audience: ContentAudience.CHILD,
      audienceName: "Child",
      minimumAge: 6,
      maximumAge: 10,
    },
  ],
};

function publication(
  overrides: Partial<ContentPublicationEntity> = {},
): ContentPublicationEntity {
  return {
    id: "pub-1",
    packageId: PACKAGE_ID,
    idempotencyKey: KEY,
    targetType: ContentPublicationTargetType.VISIT_MATERIAL_PAGE,
    status: ContentPublicationStatus.PUBLISHING,
    approvedVersions: {},
    assetId: null,
    visitMaterialPageId: null,
    errorCode: null,
    publishedAt: null,
    requestedById: "admin",
    lockVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ContentPublicationEntity;
}

describe("PublishContentPackageService", () => {
  const repo = {
    findByIdempotencyKey: jest.fn(),
    findLatestByPackageId: jest.fn(),
    begin: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    markUncertain: jest.fn(),
  };
  const documents = { execute: jest.fn() };
  const createPage = { execute: jest.fn() };
  const pages = { findBySourcePackageId: jest.fn(), findPathById: jest.fn() };
  let service: PublishContentPackageService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PublishContentPackageService(
      repo as never,
      documents as never,
      createPage as never,
      pages as never,
    );
    repo.findByIdempotencyKey.mockResolvedValue(null);
    repo.findLatestByPackageId.mockResolvedValue(null);
    repo.begin.mockResolvedValue({ publication: publication(), snapshot });
    pages.findBySourcePackageId.mockResolvedValue(null);
    pages.findPathById.mockResolvedValue("materiais_visita_esperanca");
    documents.execute.mockResolvedValue([
      {
        title: "d",
        description: "d",
        fileName: "a.pdf",
        contentType: "application/pdf",
        buffer: Buffer.from("x"),
      },
    ]);
    createPage.execute.mockResolvedValue({
      id: PAGE_ID,
      path: "materiais_visita_esperanca",
    });
    repo.complete.mockImplementation(async () =>
      publication({
        status: ContentPublicationStatus.PUBLISHED,
        visitMaterialPageId: PAGE_ID,
        publishedAt: new Date(),
      }),
    );
    repo.fail.mockImplementation(
      async (_id, _pkg, code: ContentPublicationErrorCode) =>
        publication({
          status: ContentPublicationStatus.FAILED,
          errorCode: code,
        }),
    );
    repo.markUncertain.mockImplementation(
      async (_id, code: ContentPublicationErrorCode, pageId: string | null) =>
        publication({
          status: ContentPublicationStatus.UNCERTAIN,
          errorCode: code,
          visitMaterialPageId: pageId,
        }),
    );
  });

  it("publishes: creates the page with the package data and completes", async () => {
    const result = await service.execute(
      PACKAGE_ID,
      { idempotencyKey: KEY, testament: TestamentType.NEW_TESTAMENT },
      "admin",
    );

    expect(repo.begin).toHaveBeenCalledWith(PACKAGE_ID, KEY, "admin");
    expect(createPage.execute).toHaveBeenCalledWith(
      snapshot,
      TestamentType.NEW_TESTAMENT,
      expect.any(Array),
    );
    expect(repo.complete).toHaveBeenCalledWith("pub-1", PACKAGE_ID, PAGE_ID);
    expect(result).toMatchObject({
      status: ContentPublicationStatus.PUBLISHED,
      packageId: PACKAGE_ID,
      visitMaterialPageId: PAGE_ID,
      visitMaterialPagePath: "materiais_visita_esperanca",
    });
  });

  it("defaults the testament to OLD_TESTAMENT", async () => {
    await service.execute(PACKAGE_ID, { idempotencyKey: KEY }, "admin");
    expect(createPage.execute).toHaveBeenCalledWith(
      snapshot,
      TestamentType.OLD_TESTAMENT,
      expect.any(Array),
    );
  });

  it("never returns the raw entity (no idempotencyKey, requestedById or approvedVersions)", async () => {
    const result = await service.execute(
      PACKAGE_ID,
      { idempotencyKey: KEY },
      "admin",
    );
    expect(result).not.toBeInstanceOf(ContentPublicationEntity);
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining([
        "idempotencyKey",
        "requestedById",
        "approvedVersions",
        "lockVersion",
      ]),
    );
  });

  describe("idempotency", () => {
    it("the same key returns the same publication without touching the package or the page", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(
        publication({
          status: ContentPublicationStatus.PUBLISHED,
          visitMaterialPageId: PAGE_ID,
        }),
      );

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(result.id).toBe("pub-1");
      expect(result.status).toBe(ContentPublicationStatus.PUBLISHED);
      expect(repo.begin).not.toHaveBeenCalled();
      expect(createPage.execute).not.toHaveBeenCalled();
      expect(documents.execute).not.toHaveBeenCalled();
    });

    it("a key already used by another package is a 409", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(
        publication({ packageId: "other" }),
      );
      await expect(
        service.execute(PACKAGE_ID, { idempotencyKey: KEY }, "admin"),
      ).rejects.toBeInstanceOf(ResourceConflictException);
    });

    it("a concurrent request with the same key (duplicate key on insert) answers with the winner", async () => {
      repo.findByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          publication({ status: ContentPublicationStatus.PUBLISHING }),
        );
      repo.begin.mockRejectedValue({ code: "ER_DUP_ENTRY" });

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(result.id).toBe("pub-1");
      expect(createPage.execute).not.toHaveBeenCalled();
    });
  });

  describe("states", () => {
    it("a package outside READY_FOR_PUBLICATION is a 409 and nothing is rendered or created", async () => {
      repo.begin.mockRejectedValue(
        new ResourceConflictException("não está pronto"),
      );
      await expect(
        service.execute(PACKAGE_ID, { idempotencyKey: KEY }, "admin"),
      ).rejects.toBeInstanceOf(ResourceConflictException);
      expect(documents.execute).not.toHaveBeenCalled();
      expect(createPage.execute).not.toHaveBeenCalled();
    });
  });

  describe("failures", () => {
    it("document rendering failure => FAILED and the package goes back to READY (via repository.fail)", async () => {
      documents.execute.mockRejectedValue(new Error("soffice missing"));

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.fail).toHaveBeenCalledWith(
        "pub-1",
        PACKAGE_ID,
        ContentPublicationErrorCode.DOCUMENT_RENDER_FAILED,
      );
      expect(createPage.execute).not.toHaveBeenCalled();
      expect(repo.complete).not.toHaveBeenCalled();
      expect(result.status).toBe(ContentPublicationStatus.FAILED);
      expect(result.errorMessage).toEqual(expect.any(String));
      expect(JSON.stringify(result)).not.toContain("soffice");
    });

    it("page creation failure with no page left => FAILED", async () => {
      createPage.execute.mockRejectedValue(new Error("s3 down"));

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.fail).toHaveBeenCalledWith(
        "pub-1",
        PACKAGE_ID,
        ContentPublicationErrorCode.PAGE_CREATION_FAILED,
      );
      expect(result.status).toBe(ContentPublicationStatus.FAILED);
    });

    it("page creation throws but the page exists (lost response) => completes with that page", async () => {
      createPage.execute.mockRejectedValue(new Error("timeout"));
      pages.findBySourcePackageId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: PAGE_ID, path: "p" });

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.complete).toHaveBeenCalledWith("pub-1", PACKAGE_ID, PAGE_ID);
      expect(result.status).toBe(ContentPublicationStatus.PUBLISHED);
    });

    it("page creation throws and the lookup also fails => UNCERTAIN (never FAILED)", async () => {
      createPage.execute.mockRejectedValue(new Error("timeout"));
      pages.findBySourcePackageId
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error("db down"));

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.fail).not.toHaveBeenCalled();
      expect(result.status).toBe(ContentPublicationStatus.UNCERTAIN);
    });

    it("page created but final status not saved => UNCERTAIN with the page id", async () => {
      repo.complete.mockRejectedValue(new Error("commit failed"));

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.markUncertain).toHaveBeenCalledWith(
        "pub-1",
        ContentPublicationErrorCode.FINALIZATION_FAILED,
        PAGE_ID,
      );
      expect(result.status).toBe(ContentPublicationStatus.UNCERTAIN);
      expect(result.visitMaterialPageId).toBe(PAGE_ID);
    });

    it("a page already existing for the package is reused, not duplicated", async () => {
      pages.findBySourcePackageId.mockResolvedValue({ id: PAGE_ID, path: "p" });

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(createPage.execute).not.toHaveBeenCalled();
      expect(documents.execute).not.toHaveBeenCalled();
      expect(repo.complete).toHaveBeenCalledWith("pub-1", PACKAGE_ID, PAGE_ID);
      expect(result.status).toBe(ContentPublicationStatus.PUBLISHED);
    });
  });

  describe("reconciliation by sourceLessonId", () => {
    it("UNCERTAIN publication replayed with its key and the page exists => PUBLISHED", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(
        publication({ status: ContentPublicationStatus.UNCERTAIN }),
      );
      pages.findBySourcePackageId.mockResolvedValue({ id: PAGE_ID, path: "p" });

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.complete).toHaveBeenCalledWith("pub-1", PACKAGE_ID, PAGE_ID);
      expect(result.status).toBe(ContentPublicationStatus.PUBLISHED);
    });

    it("stale PUBLISHING with no page => FAILED(INTERRUPTED) and the package returns to READY", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(
        publication({
          updatedAt: new Date(
            Date.now() - CONTENT_PUBLICATION_STALE_AFTER_MS - 1000,
          ),
        }),
      );

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(repo.fail).toHaveBeenCalledWith(
        "pub-1",
        PACKAGE_ID,
        ContentPublicationErrorCode.INTERRUPTED,
      );
      expect(result.status).toBe(ContentPublicationStatus.FAILED);
    });

    it("a recent PUBLISHING publication is not reconciled (still in progress)", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(publication());
      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );
      expect(repo.fail).not.toHaveBeenCalled();
      expect(repo.complete).not.toHaveBeenCalled();
      expect(result.status).toBe(ContentPublicationStatus.PUBLISHING);
    });

    it("a new key on a package whose latest publication is UNCERTAIN reconciles first and returns PUBLISHED", async () => {
      repo.findLatestByPackageId.mockResolvedValue(
        publication({ status: ContentPublicationStatus.UNCERTAIN }),
      );
      pages.findBySourcePackageId.mockResolvedValue({ id: PAGE_ID, path: "p" });

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: "new-key" },
        "admin",
      );

      expect(result.status).toBe(ContentPublicationStatus.PUBLISHED);
      expect(repo.begin).not.toHaveBeenCalled();
    });

    it("when the reconciliation cannot decide the doubt is kept", async () => {
      repo.findByIdempotencyKey.mockResolvedValue(
        publication({ status: ContentPublicationStatus.UNCERTAIN }),
      );
      pages.findBySourcePackageId.mockRejectedValue(new Error("db down"));

      const result = await service.execute(
        PACKAGE_ID,
        { idempotencyKey: KEY },
        "admin",
      );

      expect(result.status).toBe(ContentPublicationStatus.UNCERTAIN);
      expect(repo.fail).not.toHaveBeenCalled();
    });
  });
});
