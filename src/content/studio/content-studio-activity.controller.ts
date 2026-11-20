import { Controller, Get, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { GetGenerationActivityService } from "./services/get-generation-activity.service";
import type { GenerationActivityResponse } from "./utils/generation-activity.utils";

/** O que o Estúdio está gerando agora (todos os administradores), as vagas que sobram e o histórico recente. */
@Controller("content-studio")
@UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
@FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
export class ContentStudioActivityController {
  constructor(private readonly activity: GetGenerationActivityService) {}

  @Get("generations/activity")
  execute(): Promise<GenerationActivityResponse> {
    return this.activity.execute();
  }
}
