import { Injectable } from "@nestjs/common";

import { AiUsageRepository } from "../ai-usage.repository";
import { AI_USAGE_DEFAULT_DAYS } from "../constants";
import type { AiUsageResponseDto } from "../dto/ai-usage-response.dto";
import { aggregateAiUsage } from "../utils/ai-usage.utils";

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetAiUsageService {
  constructor(private readonly repository: AiUsageRepository) {}

  async execute(
    days: number = AI_USAGE_DEFAULT_DAYS,
  ): Promise<AiUsageResponseDto> {
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await this.repository.findGenerationSnapshotsSince(since);
    return aggregateAiUsage(rows, days, since);
  }
}
