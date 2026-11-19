import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

/** Mídias de ideias: até 10 arquivos de 200 MB (MIME validado no armazenamento quando migrado). */
const IDEAS_UPLOAD_OPTIONS = {
  limits: { fileSize: 200 * 1024 * 1024, files: 10 },
} as const;
import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";

import {
  IDEAS_SECTION_MESSAGES,
  IDEAS_SECTION_PAYLOAD_FIELD,
} from "./constants";
import { CreateIdeasSectionDto } from "./dto/create-ideas-section.dto";
import { IdeasSectionResponseDto } from "./dto/ideas-section-response.dto";
import { UpdateIdeasSectionDto } from "./dto/update-ideas-section.dto";
import { AttachIdeasSectionService } from "./services/attach-ideas-section.service";
import { CreateIdeasSectionService } from "./services/create-ideas-section.service";
import { DeleteIdeasSectionService } from "./services/delete-ideas-section.service";
import { GetIdeasSectionService } from "./services/get-ideas-section.service";
import { UpdateIdeasSectionService } from "./services/update-ideas-section.service";
import {
  parseIdeasSectionPayload,
  toFilesDict,
} from "./utils/ideas-section-payload.util";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

/**
 * Ideias compartilhadas pelos membros.
 *
 * Toda a rota é autenticada: a seção expõe nome, e-mail e telefone de quem a
 * enviou, e as duas leituras estavam **abertas ao público**.
 */
@Controller("ideas-sections")
@UseGuards(JwtAuthGuard)
export class IdeasSectionController {
  constructor(
    private readonly createService: CreateIdeasSectionService,
    private readonly updateService: UpdateIdeasSectionService,
    private readonly attachService: AttachIdeasSectionService,
    private readonly getService: GetIdeasSectionService,
    private readonly deleteService: DeleteIdeasSectionService,
  ) {}

  /** Qualquer usuário autenticado pode compartilhar uma ideia. */
  @FeatureFlag(FeatureFlagKeys.IDEA_SUBMISSION)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor(IDEAS_UPLOAD_OPTIONS))
  async create(
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(IDEAS_SECTION_PAYLOAD_FIELD) raw: string,
  ): Promise<IdeasSectionResponseDto> {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthenticatedException(
        IDEAS_SECTION_MESSAGES.UNAUTHENTICATED,
      );
    }

    const dto = parseIdeasSectionPayload(raw, CreateIdeasSectionDto);
    return this.createService.execute(dto, toFilesDict(files), userId);
  }

  @FeatureFlag(FeatureFlagKeys.IDEA_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor(IDEAS_UPLOAD_OPTIONS))
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(IDEAS_SECTION_PAYLOAD_FIELD) raw: string,
  ): Promise<IdeasSectionResponseDto> {
    const dto = parseIdeasSectionPayload(raw, UpdateIdeasSectionDto);
    return this.updateService.execute(id, dto, toFilesDict(files));
  }

  @FeatureFlag(FeatureFlagKeys.IDEA_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id/attach/:pageId")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor(IDEAS_UPLOAD_OPTIONS))
  async attach(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("pageId", new ParseUUIDPipe()) pageId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(IDEAS_SECTION_PAYLOAD_FIELD) raw: string,
  ): Promise<IdeasSectionResponseDto> {
    const dto = parseIdeasSectionPayload(raw, UpdateIdeasSectionDto);
    return this.attachService.execute(id, pageId, dto, toFilesDict(files));
  }

  @FeatureFlag(FeatureFlagKeys.IDEA_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(AdminRoleGuard)
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    await this.deleteService.execute(id);
    return { message: "Seção de ideias removida com sucesso." };
  }

  /**
   * As ideias ainda não publicadas em nenhuma página — fila de moderação do admin.
   * A resposta traz nome, e-mail e telefone do autor: nunca para outros membros.
   */
  @FeatureFlag(FeatureFlagKeys.IDEA_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(AdminRoleGuard)
  async findUnattached(): Promise<IdeasSectionResponseDto[]> {
    return this.getService.findUnattached();
  }

  @FeatureFlag(FeatureFlagKeys.IDEA_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(AdminRoleGuard)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<IdeasSectionResponseDto> {
    return this.getService.findOne(id);
  }
}
