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
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationTargetType } from "../enums/content-publication-target-type.enum";
import {
  areAllTracksPublishedAfter,
  publishableTracks,
  statusAfterPublication,
} from "../utils/content-publication-tracks.util";
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
      // O que decide é haver categoria aprovada e não publicada (abaixo); o status do pacote só não pode ser de
      // encerramento/outra publicação em andamento.
      if (
        !canTransitionContentPackage(
          locked.status,
          ContentPackageStatus.PUBLISHING,
        )
      ) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.PACKAGE_NOT_READY(locked.status),
        );
      }

      const graph = await findPackageGraphOrFail(packageRepo, packageId);
      const tracks = graph.tracks ?? [];
      // A publicação é por categoria: leva as aprovadas e ainda não publicadas; as demais seguem o seu caminho.
      const publishable = publishableTracks(tracks, locked.status);
      if (publishable.length === 0) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.STAGES_NOT_APPROVED,
        );
      }
      const audiences = publishable.map((track) => track.audience);

      locked.status = ContentPackageStatus.PUBLISHING;
      await packageRepo.save(locked);

      const approvedVersions: Record<string, string> = {};
      for (const track of publishable)
        for (const stage of (track.stages ?? []).filter(
          (item) => item.required,
        ))
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
            audiences,
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
        coverImageUrl: graph.coverImageUrl ?? null,
        tracks: [...publishable]
          .sort((a, b) => a.minimumAge - b.minimumAge)
          .map((track) => ({
            audience: track.audience,
            audienceName: track.audienceName,
            minimumAge: track.minimumAge,
            maximumAge: track.maximumAge,
            stages: (track.stages ?? [])
              .filter((stage) => stage.required)
              .sort((a, b) => a.position - b.position)
              .map((stage) => ({ id: stage.id, stageType: stage.stageType })),
          })),
        // O material completo só existe quando, depois desta publicação, todas as categorias estão na página.
        includeCompleteMaterial:
          tracks.length > 1 &&
          areAllTracksPublishedAfter(tracks, locked.status, audiences),
      };
      return { publication, snapshot };
    });
  }

  /**
   * Fim da publicação, atomicamente: marca as categorias publicadas (travando-as), grava a publicação como PUBLISHED e
   * leva o pacote a PUBLISHED (todas as categorias na página) ou de volta ao caminho das que faltam.
   * Publicação anterior ao recurso (`audiences` nulo) levava o pacote inteiro.
   */
  async complete(
    publicationId: string,
    packageId: string,
    visitMaterialPageId: string,
  ): Promise<ContentPublicationEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const publicationRepo = manager.getRepository(ContentPublicationEntity);
      const trackRepo = manager.getRepository(ContentTrackEntity);
      const locked = await lockPackageOrFail(manager, packageId);
      const publication = await publicationRepo.findOne({
        where: { id: publicationId },
      });
      if (!publication)
        throw new ResourceNotFoundException("Publicação não encontrada");

      const graph = await findPackageGraphOrFail(packageRepo, packageId);
      const tracks = graph.tracks ?? [];
      const published = publication.audiences ?? tracks.map((t) => t.audience);
      const now = new Date();
      for (const track of tracks) {
        if (published.includes(track.audience) && !track.publishedAt) {
          track.publishedAt = now;
          track.publicationId = publication.id;
          await trackRepo.save(track);
        }
      }

      const next = statusAfterPublication(tracks, locked.status, published);
      if (!canTransitionContentPackage(locked.status, next)) {
        throw new ResourceConflictException(
          CONTENT_PUBLICATION_MESSAGES.PACKAGE_NOT_READY(locked.status),
        );
      }
      locked.status = next;
      await packageRepo.save(locked);
      publication.status = ContentPublicationStatus.PUBLISHED;
      publication.visitMaterialPageId = visitMaterialPageId;
      publication.publishedAt = now;
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
    if (visitMaterialPageId)
      publication.visitMaterialPageId = visitMaterialPageId;
    return this.publications.save(publication);
  }
}
