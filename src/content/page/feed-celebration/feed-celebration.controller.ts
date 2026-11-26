import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { UnauthenticatedException } from "src/common/exceptions";
import { FEED_CELEBRATION_ROUTE } from "./constants";
import { CelebrationStateResponseDto } from "./dto/celebration-state-response.dto";
import { GetCelebrationService } from "./services/get-celebration.service";
import { UpdateCelebrationService } from "./services/update-celebration.service";

const FEED_CELEBRATION_FLAGS = [
  FeatureFlagKeys.SHELTER_FEED,
  FeatureFlagKeys.SHELTER_FEED_CELEBRATIONS,
] as const;

@Controller(FEED_CELEBRATION_ROUTE)
export class FeedCelebrationController {
  constructor(
    private readonly getService: GetCelebrationService,
    private readonly updateService: UpdateCelebrationService,
    private readonly authContext: AuthContextService,
  ) {}

  /** Contagem pública (só o número); `celebratedByMe` só com sessão. */
  @FeatureFlag(FEED_CELEBRATION_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get(":sectionId/celebration")
  async getState(
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Req() req: Request,
  ): Promise<CelebrationStateResponseDto> {
    return this.getService.getState(
      sectionId,
      await this.authContext.getUserId(req),
    );
  }

  /** Alterna a celebração do usuário autenticado. */
  @FeatureFlag(FEED_CELEBRATION_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Post(":sectionId/celebration/toggle")
  async toggle(
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CelebrationStateResponseDto> {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthenticatedException("Sessão inválida.");
    return this.updateService.toggle(sectionId, userId);
  }
}
