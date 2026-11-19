import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";

import { CONTENT_PUBLICATION_MESSAGES } from "../constants/content-publication.constants";
import type {
  BegunPublication,
  PublicationPackageSnapshot,
} from "../content-publication.types";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPublicationEntity } from "../entities/content-publication.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationTargetType } from "../enums/content-publication-target-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { canTransitionContentPackage } from "../utils/content-state-transition.util";
import {
  findPackageGraphOrFail,
  lockPackageOrFail,
} from "./content-package-graph.helpers";

/** Persistence of the publication of a package. Every multi-write operation is one transaction. */
@Injectable()
export class ContentPublicationRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ContentPublicationEntity)
    private readonly publications: Repository<ContentPublicationEntity>,
  ) {}

  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ContentPublicationEntity | null> {
    return this.publications.findOne({ where: { idempotencyKey } });
  }

  findById(id: string): Promise<ContentPublicationEntity | null> {
    return this.publications.findOne({ where: { id } });
  }

  findLatestByPackageId(
    packageId: string,
  ): Promise<ContentPublicationEntity | null> {
    return this.publications.findOne({
      where: { packageId },
      order: { createdAt: "DESC", id: "DESC" },
    });
  }

  /**
   * READY_FOR_PUBLICATION -> PUBLISHING and the PUBLISHING publication row, atomically, under the package lock.
   * Anything but a fully approved, ready package is a 409.
   */
  async begin(
    packageId: string,
    idempotencyKey: string,
    requestedById: string,
  ): Promise<BegunPublication> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const locked = await lockPackageOrFail(manager, packageId);
      if (
        locked.status !== ContentPackageStatus.READY_FOR_PUBLICATION ||
        !canTransitionContentPackage(locked.status, ContentPackageStatus.PUBLISHING)
      ) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.PACKAGE_NOT_READY(locked.status),
        );
      }

      const graph = await findPackageGraphOrFail(packageRepo, packageId);
      const tracks = graph.tracks ?? [];
      const stages = tracks.flatMap((track) => track.stages ?? []);
      const required = stages.filter((stage) => stage.required);
      if (
        required.length === 0 ||
        required.some(
          (stage) =>
            stage.status !== ContentStageStatus.APPROVED ||
            !stage.currentVersionId,
        )
      ) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.STAGES_NOT_APPROVED,
        );
      }

      locked.status = ContentPackageStatus.PUBLISHING;
      await packageRepo.save(locked);

      const approvedVersions: Record<string, string> = {};
      for (const stage of required)
        approvedVersions[stage.id] = stage.currentVersionId as string;

      const publication = await manager
        .getRepository(ContentPublicationEntity)
        .save(
          manager.getRepository(ContentPublicationEntity).create({
            packageId,
            idempotencyKey,
            targetType: ContentPublicationTargetType.VISIT_MATERIAL_PAGE,
            status: ContentPublicationStatus.PUBLISHING,
            approvedVersions,
            assetId: null,
            visitMaterialPageId: null,
            errorCode: null,
            publishedAt: null,
            requestedById,
          }),
        );

      const snapshot: PublicationPackageSnapshot = {
        packageId,
        theme: graph.theme,
        biblicalReferences: graph.biblicalReferences,
        canonicalObjective: graph.canonicalObjective,
        tracks: [...tracks]
          .sort((a, b) => a.minimumAge - b.minimumAge)
          .map((track) => ({
            audience: track.audience,
            audienceName: track.audienceName,
            minimumAge: track.minimumAge,
            maximumAge: track.maximumAge,
          })),
      };
      return { publication, snapshot };
    });
  }

  /** PUBLISHING -> PUBLISHED on both the package and the publication, atomically. */
  async complete(
    publicationId: string,
    packageId: string,
    visitMaterialPageId: string,
  ): Promise<ContentPublicationEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const publicationRepo = manager.getRepository(ContentPublicationEntity);
      const locked = await lockPackageOrFail(manager, packageId);
      const publication = await publicationRepo.findOne({
        where: { id: publicationId },
      });
      if (!publication)
        throw new ResourceNotFoundException("Publicação não encontrada");
      if (
        !canTransitionContentPackage(locked.status, ContentPackageStatus.PUBLISHED)
      ) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.PACKAGE_NOT_READY(locked.status),
        );
      }
      locked.status = ContentPackageStatus.PUBLISHED;
      await packageRepo.save(locked);
      publication.status = ContentPublicationStatus.PUBLISHED;
      publication.visitMaterialPageId = visitMaterialPageId;
      publication.publishedAt = new Date();
      publication.errorCode = null;
      return publicationRepo.save(publication);
    });
  }

  /** The attempt failed and published nothing: publication FAILED, package back to READY_FOR_PUBLICATION. */
  async fail(
    publicationId: string,
    packageId: string,
    errorCode: ContentPublicationErrorCode,
  ): Promise<ContentPublicationEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const publicationRepo = manager.getRepository(ContentPublicationEntity);
      const locked = await lockPackageOrFail(manager, packageId);
      const publication = await publicationRepo.findOne({
        where: { id: publicationId },
      });
      if (!publication)
        throw new ResourceNotFoundException("Publicação não encontrada");
      if (
        locked.status === ContentPackageStatus.PUBLISHING &&
        canTransitionContentPackage(
          locked.status,
          ContentPackageStatus.READY_FOR_PUBLICATION,
        )
      ) {
        locked.status = ContentPackageStatus.READY_FOR_PUBLICATION;
        await packageRepo.save(locked);
      }
      publication.status = ContentPublicationStatus.FAILED;
      publication.errorCode = errorCode;
      return publicationRepo.save(publication);
    });
  }

  /** The page may exist but the final state was not recorded: keep the package PUBLISHING and flag the doubt. */
  async markUncertain(
    publicationId: string,
    errorCode: ContentPublicationErrorCode,
    visitMaterialPageId: string | null,
  ): Promise<ContentPublicationEntity> {
    const publication = await this.publications.findOne({
      where: { id: publicationId },
    });
    if (!publication)
      throw new ResourceNotFoundException("Publicação não encontrada");
    publication.status = ContentPublicationStatus.UNCERTAIN;
    publication.errorCode = errorCode;
    if (visitMaterialPageId) publication.visitMaterialPageId = visitMaterialPageId;
    return this.publications.save(publication);
  }
}
