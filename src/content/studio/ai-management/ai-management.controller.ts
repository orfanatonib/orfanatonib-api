import { Controller, Get, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { AiProviderResponseDto } from "./dto/ai-provider-response.dto";
import { GetAiProvidersService } from "./services/get-ai-providers.service";

@Controller("ai-management")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AiManagementController {
  constructor(private readonly getProviders: GetAiProvidersService) {}

  @Get("providers")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO_PROVIDER_ADMIN)
  @UseGuards(FeatureFlagGuard)
  providers(): AiProviderResponseDto[] {
    return this.getProviders.execute();
  }
}
