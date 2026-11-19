import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, SelectQueryBuilder } from "typeorm";

import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import {
  CreateContentPackageGraphInput,
  QueryContentPackagesInput,
} from "../types";
import { canTransitionContentPackage } from "../utils/content-state-transition.util";
import {
  findPackageGraphOrFail,
  lockPackageOrFail,
} from "./content-package-graph.helpers";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ContentPackagesRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ContentPackageEntity)
    private readonly packageRepo: Repository<ContentPackageEntity>,
  ) {}

  async createWithCatalog(
    input: CreateContentPackageGraphInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const trackRepo = manager.getRepository(ContentTrackEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);

      const contentPackage = await packageRepo.save(
        packageRepo.create({
          theme: input.theme,
          biblicalReferences: input.biblicalReferences,
          canonicalObjective: input.canonicalObjective,
          canonicalNotes: input.canonicalNotes,
          templateCatalogVersion: input.templateCatalogVersion,
          status: ContentPackageStatus.DRAFT,
          createdById: input.createdById,
        }),
      );

      const tracks = await trackRepo.save(
        input.audiences.map((definition) =>
          trackRepo.create({
            packageId: contentPackage.id,
            audience: definition.audience,
            audienceName: definition.name,
            minimumAge: definition.minimumAge,
            maximumAge: definition.maximumAge,
          }),
        ),
      );

      const trackByAudience = new Map(
        tracks.map((track) => [track.audience, track.id]),
      );

      await stageRepo.save(
        input.audiences.flatMap((definition) => {
          const trackId = trackByAudience.get(definition.audience);
          if (!trackId) return [];

          return definition.stages.map((stage) =>
            stageRepo.create({
              trackId,
              stageType: stage.type,
              position: stage.position,
              required: stage.required,
              dependencies: [...stage.dependencies],
            }),
          );
        }),
      );

      const saved = await packageRepo.findOne({
        where: { id: contentPackage.id },
        relations: { tracks: { stages: { currentVersion: true } } },
      });

      return saved ?? contentPackage;
    });
  }

  async findAllPaginated(query: QueryContentPackagesInput): Promise<{
    data: ContentPackageEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(DEFAULT_PAGE, Number(query.page) || DEFAULT_PAGE);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(query.limit) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const countQb = this.packageRepo.createQueryBuilder("contentPackage");
    this.applyFilters(countQb, query);
    const total = await countQb.getCount();

    // Pagina primeiro só os PACOTES. Com `skip/take` junto de joins ordenados por colunas das faixas/etapas,
    // o TypeORM limita LINHAS do join (não pacotes): a página devolvia 2 pacotes de 8, com `total` 8.
    const idsQb = this.packageRepo
      .createQueryBuilder("contentPackage")
      .select("contentPackage.id");
    this.applyFilters(idsQb, query);
    const pageIds = (
      await idsQb
        .orderBy(
          `contentPackage.${query.sort ?? "createdAt"}`,
          query.order ?? (query.sort === "theme" ? "ASC" : "DESC"),
        )
        .addOrderBy("contentPackage.id", "ASC")
        .skip(skip)
        .take(limit)
        .getMany()
    ).map((item) => item.id);

    if (pageIds.length === 0) return { data: [], total, page, limit };

    const loaded = await this.packageRepo
      .createQueryBuilder("contentPackage")
      .leftJoinAndSelect("contentPackage.tracks", "track")
      .leftJoinAndSelect("track.stages", "stage")
      .where("contentPackage.id IN (:...pageIds)", { pageIds })
      .orderBy("track.minimumAge", "ASC")
      .addOrderBy("stage.position", "ASC")
      .getMany();
    // A ordem da página é a do primeiro passo (mais recentes primeiro).
    const byId = new Map(loaded.map((item) => [item.id, item]));
    const data = pageIds
      .map((id) => byId.get(id))
      .filter((item): item is ContentPackageEntity => item !== undefined);

    return { data, total, page, limit };
  }

  async findByIdWithGraph(id: string): Promise<ContentPackageEntity | null> {
    return this.packageRepo.findOne({
      where: { id },
      relations: {
        tracks: {
          stages: {
            currentVersion: true,
            reviewComments: true,
            reviewDecisions: { version: true },
          },
        },
      },
    });
  }

  async archivePackage(packageId: string): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      await lockPackageOrFail(manager, packageId);
      const contentPackage = await findPackageGraphOrFail(
        packageRepo,
        packageId,
      );

      if (
        !canTransitionContentPackage(
          contentPackage.status,
          ContentPackageStatus.ARCHIVED,
        )
      ) {
        throw new ResourceConflictException(
          `O pacote não pode ser arquivado a partir de ${contentPackage.status}`,
        );
      }

      const stages = (contentPackage.tracks ?? []).flatMap(
        (track) => track.stages ?? [],
      );
      if (
        stages.some((stage) => stage.status === ContentStageStatus.GENERATING)
      ) {
        throw new ResourceConflictException(
          "O pacote não pode ser arquivado enquanto houver geração em andamento",
        );
      }

      if (!stages.some((stage) => stage.currentVersionId !== null)) {
        throw new RuleException(
          "O pacote não pode ser arquivado antes de possuir conteúdo gerado",
        );
      }

      contentPackage.status = ContentPackageStatus.ARCHIVED;
      contentPackage.archivedAt = new Date();
      await packageRepo.save(contentPackage);

      return findPackageGraphOrFail(packageRepo, packageId);
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<ContentPackageEntity>,
    query: QueryContentPackagesInput,
  ): void {
    if (query.startDate) {
      qb.andWhere("contentPackage.createdAt >= :startDate", {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
      qb.andWhere("contentPackage.createdAt <= :endDate", { endDate });
    }

    if (query.audience) {
      // EXISTS em vez de JOIN: um join solto quebra a paginação (`skip/take`) do TypeORM.
      qb.andWhere(
        "EXISTS (SELECT 1 FROM content_tracks filterTrack WHERE filterTrack.package_id = contentPackage.id AND filterTrack.audience = :audience)",
        { audience: query.audience },
      );
    }

    const statuses = [
      ...(query.status ? [query.status] : []),
      ...(query.statuses ?? []),
    ];
    if (statuses.length > 0) {
      qb.andWhere("contentPackage.status IN (:...statuses)", { statuses });
    } else if (!query.reviewQueue) {
      // Sem filtro de situação, os arquivados ficam de fora (aparecem escolhendo "Arquivados").
      qb.andWhere("contentPackage.status <> :archived", {
        archived: ContentPackageStatus.ARCHIVED,
      });
    }

    if (query.reviewQueue) {
      qb.andWhere("contentPackage.status IN (:...reviewStatuses)", {
        reviewStatuses: [
          ContentPackageStatus.PACKAGE_READY,
          ContentPackageStatus.IN_REVIEW,
          ContentPackageStatus.CHANGES_REQUESTED,
          ContentPackageStatus.READY_FOR_PUBLICATION,
        ],
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        "(contentPackage.theme LIKE :search OR contentPackage.biblicalReferences LIKE :search)",
        { search: `%${search}%` },
      );
    }
  }
}
