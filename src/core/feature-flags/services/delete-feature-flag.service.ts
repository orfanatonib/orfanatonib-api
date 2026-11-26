import { Injectable, Logger } from "@nestjs/common";

import { ResourceConflictException } from "src/common/exceptions";
import { FEATURE_FLAG_PROTECTED_CODE } from "../constants";
import { isProtectedFlag } from "../utils";
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
    if (isProtectedFlag(flag)) {
      throw new ResourceConflictException(
        `A flag de fábrica "${flag.key}" não pode ser removida; desligue-a`,
        { code: FEATURE_FLAG_PROTECTED_CODE, key: flag.key },
      );
    }
    await this.repository.remove(flag);
    this.getService.invalidate(key);
    this.logger.log(`Feature flag removida: ${key}`);
  }
}
