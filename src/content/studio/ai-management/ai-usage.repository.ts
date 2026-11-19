import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ContentVersionEntity } from "../entities/content-version.entity";
import type { GenerationSnapshotRow } from "./utils/ai-usage.utils";

@Injectable()
export class AiUsageRepository {
  constructor(
    @InjectRepository(ContentVersionEntity)
    private readonly versions: Repository<ContentVersionEntity>,
  ) {}

  /** Snapshots de geração das versões criadas desde `since` (só as geradas por IA têm snapshot). */
  async findGenerationSnapshotsSince(
    since: Date,
  ): Promise<GenerationSnapshotRow[]> {
    const rows = await this.versions
      .createQueryBuilder("version")
      .select("version.generationSnapshot", "snapshot")
      .where("version.createdAt >= :since", { since })
      .andWhere("version.generationSnapshot IS NOT NULL")
      .getRawMany<{ snapshot: GenerationSnapshotRow | string | null }>();
    return rows.flatMap(({ snapshot }) => {
      if (!snapshot) return [];
      if (typeof snapshot !== "string") return [snapshot];
      try {
        return [JSON.parse(snapshot) as GenerationSnapshotRow];
      } catch {
        return [];
      }
    });
  }
}
