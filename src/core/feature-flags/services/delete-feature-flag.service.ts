import { Injectable, Logger } from "@nestjs/common";

import { RuleException } from "src/common/exceptions";
import { DEFAULT_FEATURE_FLAGS } from "../constants";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { GetFeatureFlagsService } from "./get-feature-flags.service";

@Injectable()
export class DeleteFeatureFlagService {
  private readonly logger = new Logger(DeleteFeatureFlagService.name);

  constructor(
    private readonly repository: FeatureFlagsRepository,
    private readonly getService: GetFeatureFlagsService,
  ) {}

  async remove(key: string): Promise<void> {
    const flag = await this.getService.findEntityOrFail(key);
    // Flag de fábrica é recriada no boot: para desativar, desligue-a.
    if (DEFAULT_FEATURE_FLAGS.some((d) => d.key === flag.key)) {
      throw new RuleException(
        `A flag de fábrica "${flag.key}" não pode ser removida; desligue-a`,
      );
    }
    await this.repository.remove(flag);
    this.getService.invalidate(key);
    this.logger.log(`Feature flag removida: ${key}`);
  }
}
