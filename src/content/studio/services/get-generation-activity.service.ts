import { Injectable } from "@nestjs/common";

import { GenerationActivityRepository } from "../repositories/generation-activity.repository";
import {
  buildGenerationActivity,
  GenerationActivityResponse,
} from "../utils/generation-activity.utils";

@Injectable()
export class GetGenerationActivityService {
  constructor(private readonly activity: GenerationActivityRepository) {}

  async execute(): Promise<GenerationActivityResponse> {
    const [active, recent] = await Promise.all([
      this.activity.findActive(),
      this.activity.findRecentFinished(),
    ]);
    return buildGenerationActivity(active, recent);
  }
}
