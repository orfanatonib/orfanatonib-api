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
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
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

  @Patch(":id")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(IDEAS_SECTION_PAYLOAD_FIELD) raw: string,
  ): Promise<IdeasSectionResponseDto> {
    const dto = parseIdeasSectionPayload(raw, UpdateIdeasSectionDto);
    return this.updateService.execute(id, dto, toFilesDict(files));
  }

  @Patch(":id/attach/:pageId")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async attach(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("pageId", new ParseUUIDPipe()) pageId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(IDEAS_SECTION_PAYLOAD_FIELD) raw: string,
  ): Promise<IdeasSectionResponseDto> {
    const dto = parseIdeasSectionPayload(raw, UpdateIdeasSectionDto);
    return this.attachService.execute(id, pageId, dto, toFilesDict(files));
  }

  @Delete(":id")
  @UseGuards(AdminRoleGuard)
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    await this.deleteService.execute(id);
    return { message: "Seção de ideias removida com sucesso." };
  }

  /** As ideias ainda não publicadas em nenhuma página. */
  @Get()
  async findUnattached(): Promise<IdeasSectionResponseDto[]> {
    return this.getService.findUnattached();
  }

  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<IdeasSectionResponseDto> {
    return this.getService.findOne(id);
  }
}
