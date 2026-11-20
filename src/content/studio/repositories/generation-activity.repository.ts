import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ACTIVE_CONTENT_GENERATION_JOB_STATUSES } from "../types";

/** Linha crua de um job com o contexto que a tela precisa (material, categoria e tipo da etapa). */
export interface GenerationActivityRow {
  jobId: string;
  stageId: string;
  capability: string;
  status: string;
  attempts: number;
  progress: Record<string, unknown> | string | null;
  errorCode: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  heartbeatAt: Date | string | null;
  stageType: string;
  trackId: string;
  audience: string;
  packageId: string;
  theme: string;
  biblicalReferences: string;
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 200;

@Injectable()
export class GenerationActivityRepository {
  constructor(
    @InjectRepository(ContentGenerationJobEntity)
    private readonly jobs: Repository<ContentGenerationJobEntity>,
  ) {}

  private base() {
    return this.jobs
      .createQueryBuilder("job")
      .innerJoin("content_stages", "stage", "stage.id = job.stage_id")
      .innerJoin("content_tracks", "track", "track.id = stage.track_id")
      .innerJoin("content_packages", "pkg", "pkg.id = track.package_id")
      .select("job.id", "jobId")
      .addSelect("job.stage_id", "stageId")
      .addSelect("job.capability", "capability")
      .addSelect("job.status", "status")
      .addSelect("job.attempts", "attempts")
      .addSelect("job.progress", "progress")
      .addSelect("job.errorCode", "errorCode")
      .addSelect("job.createdAt", "createdAt")
      .addSelect("job.updatedAt", "updatedAt")
      .addSelect("job.heartbeatAt", "heartbeatAt")
      .addSelect("stage.stageType", "stageType")
      .addSelect("track.id", "trackId")
      .addSelect("track.audience", "audience")
      .addSelect("pkg.id", "packageId")
      .addSelect("pkg.theme", "theme")
      .addSelect("pkg.biblicalReferences", "biblicalReferences");
  }

  /** Gerações em andamento (de todos os administradores), da mais antiga para a mais nova. */
  findActive(): Promise<GenerationActivityRow[]> {
    return this.base()
      .where({ status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]) })
      .orderBy("job.createdAt", "ASC")
      .getRawMany<GenerationActivityRow>();
  }

  /** Gerações encerradas nas últimas 24 horas, da mais recente para a mais antiga. */
  findRecentFinished(now: Date = new Date()): Promise<GenerationActivityRow[]> {
    return this.base()
      .where({ status: Not(In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES])) })
      .andWhere("job.updatedAt >= :since", {
        since: new Date(now.getTime() - RECENT_WINDOW_MS),
      })
      .orderBy("job.updatedAt", "DESC")
      .limit(RECENT_LIMIT)
      .getRawMany<GenerationActivityRow>();
  }
}
