import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import type { Response } from "express";

import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { ContentPublicationResponseDto } from "./dto/content-publication-response.dto";
import { PublishContentPackageDto } from "./dto/publish-content-package.dto";
import { GetContentPublicationService } from "./services/get-content-publication.service";
import { PublishContentPackageService } from "./services/publish-content-package.service";

/** Publicação do material como página de materiais para visita (flags `content_studio` + `content_studio_publication`). */
@Controller("content-studio/packages/:packageId")
export class ContentStudioPublicationController {
  constructor(
    private readonly publish: PublishContentPackageService,
    private readonly getPublication: GetContentPublicationService,
  ) {}

  @Post("publish")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_PUBLICATION,
  ])
  @UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
  async publishPackage(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Body() dto: PublishContentPackageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPublicationResponseDto> {
    const userId = request.user?.userId;
    if (!userId)
      throw new UnauthenticatedException("Usuário autenticado não encontrado");
    return this.publish.execute(packageId, dto, userId);
  }

  /** Última publicação do material; `204` quando nunca houve. */
  @Get("publication")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_PUBLICATION,
  ])
  @UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
  async latestPublication(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ContentPublicationResponseDto | null> {
    const latest = await this.getPublication.findLatest(packageId);
    if (!latest) response.status(HttpStatus.NO_CONTENT);
    return latest;
  }
}
