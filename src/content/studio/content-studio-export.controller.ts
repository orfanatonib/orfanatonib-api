import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";

import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { ContentAudience } from "./enums/content-audience.enum";
import {
  StudioExportFormat,
  StudioExportService,
  type StudioExportFile,
} from "./export/studio-export.service";

/**
 * Exportação do material para visita. `pdf` abre no navegador (prévia); `docx` baixa.
 * Sempre a partir da versão ATUAL SALVA: o que está só no rascunho local não entra.
 */
@Controller("content-studio/packages/:packageId")
@FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
@UseGuards(JwtAuthGuard, AdminRoleGuard, FeatureFlagGuard)
export class ContentStudioExportController {
  constructor(private readonly exports: StudioExportService) {}

  private file(
    file: StudioExportFile,
    format: StudioExportFormat,
  ): StreamableFile {
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `${format === StudioExportFormat.PDF ? "inline" : "attachment"}; filename="${file.fileName}"`,
      length: file.buffer.length,
    });
  }

  /** Documento da etapa para o editor: o editado à mão ou o montado dos campos (`edited` diz qual). */
  @Get("stages/:stageId/document")
  async document(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
  ) {
    return this.exports.stageDocumentFor(packageId, stageId);
  }

  @Get("stages/:stageId/export/:format")
  async stage(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
    @Param("format", new ParseEnumPipe(StudioExportFormat))
    format: StudioExportFormat,
  ): Promise<StreamableFile> {
    return this.file(
      await this.exports.exportStage(packageId, stageId, format),
      format,
    );
  }

  @Get("tracks/:audience/export/:format")
  async track(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("audience", new ParseEnumPipe(ContentAudience))
    audience: ContentAudience,
    @Param("format", new ParseEnumPipe(StudioExportFormat))
    format: StudioExportFormat,
  ): Promise<StreamableFile> {
    return this.file(
      await this.exports.exportTrack(packageId, audience, format),
      format,
    );
  }

  @Get("export/:format")
  async all(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("format", new ParseEnumPipe(StudioExportFormat))
    format: StudioExportFormat,
  ): Promise<StreamableFile> {
    return this.file(
      await this.exports.exportPackage(packageId, format),
      format,
    );
  }
}
