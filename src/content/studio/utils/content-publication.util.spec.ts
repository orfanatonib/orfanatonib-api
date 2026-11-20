import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

import { CONTENT_PUBLICATION_STALE_AFTER_MS } from "../constants/content-publication.constants";
import { PublishContentPackageDto } from "../dto/publish-content-package.dto";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import {
  documentFieldKey,
  isDuplicateKeyError,
  needsReconciliation,
  toSyntheticMulterFile,
} from "./content-publication.util";

describe("content-publication.util", () => {
  it("detects the MySQL duplicate-key error, also wrapped by TypeORM", () => {
    expect(isDuplicateKeyError({ code: "ER_DUP_ENTRY" })).toBe(true);
    expect(isDuplicateKeyError({ driverError: { errno: 1062 } })).toBe(true);
    expect(isDuplicateKeyError(new Error("x"))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });

  it("flags UNCERTAIN and stale PUBLISHING for reconciliation, not fresh PUBLISHING", () => {
    const now = new Date();
    const old = new Date(
      now.getTime() - CONTENT_PUBLICATION_STALE_AFTER_MS - 1,
    );
    expect(
      needsReconciliation(
        { status: ContentPublicationStatus.UNCERTAIN, updatedAt: now },
        now,
      ),
    ).toBe(true);
    expect(
      needsReconciliation(
        { status: ContentPublicationStatus.PUBLISHING, updatedAt: old },
        now,
      ),
    ).toBe(true);
    expect(
      needsReconciliation(
        { status: ContentPublicationStatus.PUBLISHING, updatedAt: now },
        now,
      ),
    ).toBe(false);
    expect(
      needsReconciliation(
        { status: ContentPublicationStatus.PUBLISHED, updatedAt: old },
        now,
      ),
    ).toBe(false);
  });

  it("builds a synthetic multer file from a buffer", () => {
    const file = toSyntheticMulterFile(documentFieldKey(0), {
      title: "t",
      description: "d",
      fileName: "a.pdf",
      contentType: "application/pdf",
      buffer: Buffer.from("abc"),
    });
    expect(file).toMatchObject({
      fieldname: "studio-doc-1",
      originalname: "a.pdf",
      size: 3,
      mimetype: "application/pdf",
    });
  });
});

describe("PublishContentPackageDto", () => {
  const errors = (payload: object) =>
    validateSync(plainToInstance(PublishContentPackageDto, payload)).map(
      (e) => e.property,
    );

  it("accepts key only and key + testament", () => {
    expect(errors({ idempotencyKey: "k" })).toEqual([]);
    expect(errors({ idempotencyKey: "k", testament: "NEW_TESTAMENT" })).toEqual(
      [],
    );
  });

  it("rejects missing/long key and unknown testament", () => {
    expect(errors({})).toContain("idempotencyKey");
    expect(errors({ idempotencyKey: "x".repeat(192) })).toContain(
      "idempotencyKey",
    );
    expect(errors({ idempotencyKey: "k", testament: "OTHER" })).toContain(
      "testament",
    );
  });
});
