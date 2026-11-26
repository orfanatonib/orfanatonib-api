import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import {
  ListPromptPreferencesQueryDto,
  PromptPreferenceResponseDto,
  ResetPromptPreferenceDto,
  SavePromptPreferenceDto,
} from "./prompt-preferences/dto/prompt-preference.dto";
import { ListPromptPreferencesService } from "./prompt-preferences/services/list-prompt-preferences.service";
import { ResetPromptPreferenceService } from "./prompt-preferences/services/reset-prompt-preference.service";
import { SavePromptPreferenceService } from "./prompt-preferences/services/save-prompt-preference.service";

/** Orientações de criação: pessoais de cada administrador, por público e por etapa. */
@Controller("content-studio/prompt-preferences/me")
@UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
@FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
export class ContentStudioPromptPreferencesController {
  constructor(
    private readonly list: ListPromptPreferencesService,
    private readonly save: SavePromptPreferenceService,
    private readonly reset: ResetPromptPreferenceService,
  ) {}

  @Get()
  listMine(
    @Query() query: ListPromptPreferencesQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PromptPreferenceResponseDto[]> {
    return this.list.execute(this.userId(request), query.audience);
  }

  @Patch()
  saveMine(
    @Body() dto: SavePromptPreferenceDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PromptPreferenceResponseDto> {
    return this.save.execute(this.userId(request), dto);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  resetMine(
    @Body() dto: ResetPromptPreferenceDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PromptPreferenceResponseDto> {
    return this.reset.execute(this.userId(request), dto);
  }

  private userId(request: AuthenticatedRequest): string {
    const userId = request.user?.userId;
    if (!userId)
      throw new UnauthenticatedException("Usuário autenticado não encontrado");
    return userId;
  }
}
