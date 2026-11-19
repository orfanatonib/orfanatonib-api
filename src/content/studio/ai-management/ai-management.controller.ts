import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { AiProviderResponseDto } from "./dto/ai-provider-response.dto";
import { AiUsageQueryDto } from "./dto/ai-usage-query.dto";
import { AiUsageResponseDto } from "./dto/ai-usage-response.dto";
import { GetAiUsageService } from "./services/get-ai-usage.service";
import { GetAiProvidersService } from "./services/get-ai-providers.service";

@Controller("ai-management")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AiManagementController {
  constructor(
    private readonly getProviders: GetAiProvidersService,
    private readonly getUsage: GetAiUsageService,
  ) {}

  @Get("providers")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO_PROVIDER_ADMIN)
  @UseGuards(FeatureFlagGuard)
  providers(): AiProviderResponseDto[] {
    return this.getProviders.execute();
  }

  /** Uso de IA do Estúdio (gerações e tokens por provedor/modelo) na janela pedida. */
  @Get("usage")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO_PROVIDER_ADMIN)
  @UseGuards(FeatureFlagGuard)
  usage(@Query() query: AiUsageQueryDto): Promise<AiUsageResponseDto> {
    return this.getUsage.execute(query.days);
  }
}
