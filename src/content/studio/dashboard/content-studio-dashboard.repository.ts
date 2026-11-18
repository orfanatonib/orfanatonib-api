import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import {
  DashboardData,
  DashboardJobStats,
  DashboardPackageStats,
  DashboardStageStats,
} from "../types";
import type { ContentStudioDashboardQuery } from "../types";

const RECENT_PACKAGES_LIMIT = 5;

@Injectable()
export class ContentStudioDashboardRepository {
  constructor(
    @InjectRepository(ContentPackageEntity)
    private readonly packageRepo: Repository<ContentPackageEntity>,
    @InjectRepository(ContentStageEntity)
    private readonly stageRepo: Repository<ContentStageEntity>,
    @InjectRepository(ContentGenerationJobEntity)
    private readonly jobRepo: Repository<ContentGenerationJobEntity>,
  ) {}

  async getDashboard(
    filters: ContentStudioDashboardQuery = {},
  ): Promise<DashboardData> {
    const applyScope = <T extends ObjectLiteral>(
      query: SelectQueryBuilder<T>,
      packageAlias: string,
      trackAlias: string,
    ) => {
      if (filters.startDate)
        query.andWhere(`${packageAlias}.createdAt >= :startDate`, {
          startDate: new Date(filters.startDate),
        });
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate))
          endDate.setUTCHours(23, 59, 59, 999);
        query.andWhere(`${packageAlias}.createdAt <= :endDate`, {
          endDate,
        });
      }
      if (filters.audience)
        query.andWhere(`${trackAlias}.audience = :audience`, {
          audience: filters.audience,
        });
      return query;
    };
    const [packageStatusRows, stageStatusRows, jobStatusRows, recent] =
      await Promise.all([
        applyScope(
          this.packageRepo
            .createQueryBuilder("pkg")
            .select("pkg.status", "status")
            .addSelect("COUNT(DISTINCT pkg.id)", "count")
            .leftJoin("pkg.tracks", "track")
            .groupBy("pkg.status"),
          "pkg",
          "track",
        ).getRawMany<{ status: ContentPackageStatus; count: string }>(),
        applyScope(
          this.stageRepo
            .createQueryBuilder("stage")
            .innerJoin("stage.track", "track")
            .innerJoin("track.contentPackage", "pkg")
            .select("stage.status", "status")
            .addSelect("COUNT(DISTINCT stage.id)", "count")
            .groupBy("stage.status"),
          "pkg",
          "track",
        ).getRawMany<{ status: ContentStageStatus; count: string }>(),
        applyScope(
          this.jobRepo
            .createQueryBuilder("job")
            .innerJoin("job.stage", "stage")
            .innerJoin("stage.track", "track")
            .innerJoin("track.contentPackage", "pkg")
            .select("job.status", "status")
            .addSelect("COUNT(DISTINCT job.id)", "count")
            .groupBy("job.status"),
          "pkg",
          "track",
        ).getRawMany<{ status: ContentGenerationJobStatus; count: string }>(),
        applyScope(
          this.packageRepo
            .createQueryBuilder("pkg")
            .leftJoinAndSelect("pkg.tracks", "track")
            .leftJoinAndSelect("track.stages", "stage")
            .orderBy("pkg.createdAt", "DESC")
            .take(RECENT_PACKAGES_LIMIT),
          "pkg",
          "track",
        ).getMany(),
      ]);

    const packageCountByStatus = new Map(
      packageStatusRows.map((row) => [row.status, Number(row.count)]),
    );
    const byStatus = Object.values(ContentPackageStatus).reduce(
      (counts, status) => {
        counts[status] = packageCountByStatus.get(status) ?? 0;
        return counts;
      },
      {} as Record<ContentPackageStatus, number>,
    );
    const packages: DashboardPackageStats = {
      total: packageStatusRows.reduce((sum, row) => sum + Number(row.count), 0),
      byStatus,
      inProduction:
        (packageCountByStatus.get(ContentPackageStatus.DRAFT) ?? 0) +
        (packageCountByStatus.get(ContentPackageStatus.IN_PROGRESS) ?? 0) +
        (packageCountByStatus.get(ContentPackageStatus.CHANGES_REQUESTED) ?? 0),
      awaitingReview:
        (packageCountByStatus.get(ContentPackageStatus.PACKAGE_READY) ?? 0) +
        (packageCountByStatus.get(ContentPackageStatus.IN_REVIEW) ?? 0),
      readyForPublication:
        packageCountByStatus.get(ContentPackageStatus.READY_FOR_PUBLICATION) ??
        0,
      publishedTotal:
        packageCountByStatus.get(ContentPackageStatus.PUBLISHED) ?? 0,
    };

    const stageCountByStatus = new Map(
      stageStatusRows.map((row) => [row.status, Number(row.count)]),
    );
    const stages: DashboardStageStats = {
      total: stageStatusRows.reduce((sum, row) => sum + Number(row.count), 0),
      approved: stageCountByStatus.get(ContentStageStatus.APPROVED) ?? 0,
      pendingReview: stageCountByStatus.get(ContentStageStatus.IN_REVIEW) ?? 0,
      changesRequested:
        stageCountByStatus.get(ContentStageStatus.CHANGES_REQUESTED) ?? 0,
      failed: stageCountByStatus.get(ContentStageStatus.FAILED) ?? 0,
    };

    const jobCountByStatus = new Map(
      jobStatusRows.map((row) => [row.status, Number(row.count)]),
    );
    const jobs: DashboardJobStats = {
      pending: jobCountByStatus.get(ContentGenerationJobStatus.PENDING) ?? 0,
      running: jobCountByStatus.get(ContentGenerationJobStatus.RUNNING) ?? 0,
      failed: jobCountByStatus.get(ContentGenerationJobStatus.FAILED) ?? 0,
    };

    return { packages, stages, jobs, recent };
  }
}
