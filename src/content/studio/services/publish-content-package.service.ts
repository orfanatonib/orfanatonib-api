import { Injectable, Logger } from "@nestjs/common";

import { ResourceConflictException } from "src/common/exceptions";
import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";

import { CONTENT_PUBLICATION_MESSAGES } from "../constants/content-publication.constants";
import type {
  BegunPublication,
  PublicationDocumentFile,
  PublishedPageRef,
} from "../content-publication.types";
import { ContentPublicationResponseDto } from "../dto/content-publication-response.dto";
import { PublishContentPackageDto } from "../dto/publish-content-package.dto";
import { ContentPublicationEntity } from "../entities/content-publication.entity";
import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationRepository } from "../repositories/content-publication.repository";
import {
  isDuplicateKeyError,
  needsReconciliation,
} from "../utils/content-publication.util";
import { BuildPublicationDocumentsService } from "./build-publication-documents.service";
import { CreatePublicationPageService } from "./create-publication-page.service";
import { GetPublicationPageService } from "./get-publication-page.service";

/**
 * Publishes an approved package as a visit-material page.
 *
 * 1. (tx) READY_FOR_PUBLICATION -> PUBLISHING + publication row (unique idempotency key);
 * 2. outside any DB transaction: render documents and create the page through the page module's service;
 * 3. (tx) PUBLISHING -> PUBLISHED + publication PUBLISHED.
 * A failure in step 2 returns the package to READY_FOR_PUBLICATION (publication FAILED). If the page exists but step 3
 * fails, the publication is UNCERTAIN and is reconciled by `sourceLessonId` on the next call.
 */
@Injectable()
export class PublishContentPackageService {
  private readonly logger = new Logger(PublishContentPackageService.name);

  constructor(
    private readonly publications: ContentPublicationRepository,
    private readonly documents: BuildPublicationDocumentsService,
    private readonly createPage: CreatePublicationPageService,
    private readonly pages: GetPublicationPageService,
  ) {}

  async execute(
    packageId: string,
    dto: PublishContentPackageDto,
    actorId: string,
  ): Promise<ContentPublicationResponseDto> {
    const existing = await this.publications.findByIdempotencyKey(
      dto.idempotencyKey,
    );
    if (existing) return this.replay(existing, packageId);

    const latest = await this.publications.findLatestByPackageId(packageId);
    if (latest && needsReconciliation(latest)) {
      const reconciled = await this.reconcile(latest);
      if (reconciled.status === ContentPublicationStatus.PUBLISHED)
        return this.toResponse(reconciled);
    }

    let begun: BegunPublication;
    try {
      begun = await this.publications.begin(packageId, dto.idempotencyKey, actorId);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // Same key won the race: answer with its publication.
      const winner = await this.publications.findByIdempotencyKey(dto.idempotencyKey);
      if (!winner) throw error;
      return this.replay(winner, packageId);
    }

    return this.toResponse(
      await this.run(begun, dto.testament ?? TestamentType.OLD_TESTAMENT),
    );
  }

  /** Same key = same publication (never a second page). */
  private async replay(
    publication: ContentPublicationEntity,
    packageId: string,
  ): Promise<ContentPublicationResponseDto> {
    if (publication.packageId !== packageId)
      throw new ResourceConflictException(
        CONTENT_PUBLICATION_MESSAGES.KEY_BELONGS_TO_OTHER_PACKAGE,
      );
    const current = needsReconciliation(publication)
      ? await this.reconcile(publication)
      : publication;
    return this.toResponse(current);
  }

  private async run(
    begun: BegunPublication,
    testament: TestamentType,
  ): Promise<ContentPublicationEntity> {
    const { publication, snapshot } = begun;

    let page: PublishedPageRef | null;
    try {
      page = await this.pages.findBySourcePackageId(snapshot.packageId);
    } catch (error) {
      this.logger.error(`Lookup da página do material ${snapshot.packageId} falhou`, error);
      return this.publications.fail(
        publication.id,
        snapshot.packageId,
        ContentPublicationErrorCode.PAGE_CREATION_FAILED,
      );
    }

    if (!page) {
      let documents: PublicationDocumentFile[];
      try {
        documents = await this.documents.execute(snapshot);
      } catch (error) {
        this.logger.error(`Render dos documentos do material ${snapshot.packageId} falhou`, error);
        return this.publications.fail(
          publication.id,
          snapshot.packageId,
          ContentPublicationErrorCode.DOCUMENT_RENDER_FAILED,
        );
      }
      try {
        page = await this.createPage.execute(snapshot, testament, documents);
      } catch (error) {
        this.logger.error(`Criação da página do material ${snapshot.packageId} falhou`, error);
        const recovered = await this.recoverPageAfterFailure(snapshot.packageId);
        if (recovered === undefined) return this.markUncertain(publication, null);
        if (recovered === null)
          return this.publications.fail(
            publication.id,
            snapshot.packageId,
            ContentPublicationErrorCode.PAGE_CREATION_FAILED,
          );
        page = recovered;
      }
    }

    try {
      const completed = await this.publications.complete(
        publication.id,
        snapshot.packageId,
        page.id,
      );
      return completed;
    } catch (error) {
      this.logger.error(`Finalização da publicação ${publication.id} falhou`, error);
      return this.markUncertain(publication, page.id);
    }
  }

  /** `undefined` = could not check (uncertain); `null` = no page exists; otherwise the page that exists. */
  private async recoverPageAfterFailure(
    packageId: string,
  ): Promise<PublishedPageRef | null | undefined> {
    try {
      return await this.pages.findBySourcePackageId(packageId);
    } catch {
      return undefined;
    }
  }

  private async markUncertain(
    publication: ContentPublicationEntity,
    pageId: string | null,
  ): Promise<ContentPublicationEntity> {
    try {
      return await this.publications.markUncertain(
        publication.id,
        ContentPublicationErrorCode.FINALIZATION_FAILED,
        pageId,
      );
    } catch (error) {
      // The row stays PUBLISHING; it becomes reconcilable once stale.
      this.logger.error(`Não foi possível marcar ${publication.id} como incerta`, error);
      return publication;
    }
  }

  /** Decides an UNCERTAIN/stale publication by the page that exists for the package (`sourceLessonId`). */
  private async reconcile(
    publication: ContentPublicationEntity,
  ): Promise<ContentPublicationEntity> {
    try {
      const page = await this.pages.findBySourcePackageId(publication.packageId);
      if (page)
        return await this.publications.complete(
          publication.id,
          publication.packageId,
          page.id,
        );
      return await this.publications.fail(
        publication.id,
        publication.packageId,
        ContentPublicationErrorCode.INTERRUPTED,
      );
    } catch (error) {
      // Could not decide: keep the doubt instead of guessing.
      this.logger.warn(`Reconciliação da publicação ${publication.id} falhou: ${String(error)}`);
      return publication;
    }
  }

  private async toResponse(
    publication: ContentPublicationEntity,
  ): Promise<ContentPublicationResponseDto> {
    let path: string | null = null;
    if (publication.visitMaterialPageId) {
      try {
        path = await this.pages.findPathById(publication.visitMaterialPageId);
      } catch {
        path = null;
      }
    }
    return ContentPublicationResponseDto.fromEntity(publication, path);
  }
}
