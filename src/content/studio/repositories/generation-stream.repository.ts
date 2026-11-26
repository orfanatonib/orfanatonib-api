import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";

const JOBS_LIMIT = 200;

@Injectable()
export class GenerationStreamRepository {
  constructor(
    @InjectRepository(ContentGenerationJobEntity)
    private readonly jobs: Repository<ContentGenerationJobEntity>,
    @InjectRepository(ContentTrackEntity)
    private readonly tracks: Repository<ContentTrackEntity>,
  ) {}

  async packageExists(packageId: string): Promise<boolean> {
    return (await this.tracks.count({ where: { packageId } })) > 0;
  }

  /** Jobs de geração das etapas do pacote, do mais novo para o mais antigo. */
  findJobsOfPackage(packageId: string): Promise<ContentGenerationJobEntity[]> {
    return this.jobs
      .createQueryBuilder("job")
      .where(
        `job.stageId IN (SELECT stage.id FROM content_stages stage INNER JOIN content_tracks track ON track.id = stage.track_id WHERE track.package_id = :packageId)`,
        { packageId },
      )
      .orderBy("job.createdAt", "DESC")
      .take(JOBS_LIMIT)
      .getMany();
  }
}
