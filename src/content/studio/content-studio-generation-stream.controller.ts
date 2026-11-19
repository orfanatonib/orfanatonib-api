import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { GenerationStreamService } from "./services/generation-stream.service";
import { formatSseFrame } from "./utils/generation-stream.utils";

/** Andamento das gerações por SSE (o front cai para polling se a conexão falhar). */
@Controller("content-studio")
@UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
@FeatureFlag([
  FeatureFlagKeys.CONTENT_STUDIO,
  FeatureFlagKeys.CONTENT_STUDIO_GENERATION,
])
export class ContentStudioGenerationStreamController {
  constructor(private readonly stream: GenerationStreamService) {}

  @Get("packages/:packageId/generations/stream")
  async generations(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const abort = new AbortController();
    request.on("close", () => abort.abort());
    const frames = this.stream.watch(packageId, abort.signal);
    // Pacote inexistente: o 404 sai ANTES dos headers de stream (a exceção sobe pelo filtro global).
    const first = await frames.next();
    response.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.flushHeaders();
    if (!first.done) response.write(formatSseFrame(first.value));
    if (!first.done) {
      for await (const frame of frames) {
        if (abort.signal.aborted) break;
        response.write(formatSseFrame(frame));
      }
    }
    response.end();
  }
}
