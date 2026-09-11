import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";

import { CreateVisitMaterialsPageDto } from "./dto/create-visit-material-page.dto";
import { UpdateVisitMaterialsPageDto } from "./dto/update-visit-material-page.dto";
import { QueryVisitMaterialsPageDto } from "./dto/query-visit-material-pages.dto";
import { VisitMaterialsPageResponseDTO } from "./dto/visit-material-page-response.dto";
import { CreateVisitMaterialPageService } from "./services/create-visit-material-page.service";
import { GetVisitMaterialPageService } from "./services/get-visit-material-page.service";
import { UpdateVisitMaterialPageService } from "./services/update-visit-material-page.service";
import { DeleteVisitMaterialPageService } from "./services/delete-visit-material-page.service";
import { SetCurrentVisitMaterialPageService } from "./services/set-current-visit-material-page.service";
import {
  parseVisitMaterialPayload,
  toFilesDict,
} from "./utils/visit-material-payload.util";
import { VISIT_MATERIAL_PAYLOAD_FIELD } from "./constants";

@Controller("visit-material-pages")
@UseGuards(JwtAuthGuard)
export class VisitMaterialsPageController {
  constructor(
    private readonly createService: CreateVisitMaterialPageService,
    private readonly getService: GetVisitMaterialPageService,
    private readonly updateService: UpdateVisitMaterialPageService,
    private readonly deleteService: DeleteVisitMaterialPageService,
    private readonly setCurrentService: SetCurrentVisitMaterialPageService,
  ) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body(VISIT_MATERIAL_PAYLOAD_FIELD) raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    // The payload rides a multipart text field, so the global ValidationPipe
    // never sees it; parsing and validating it stays a transport concern.
    const dto = parseVisitMaterialPayload(raw, CreateVisitMaterialsPageDto);
    return this.createService.execute(dto, toFilesDict(files));
  }

  @Patch(":id")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(VISIT_MATERIAL_PAYLOAD_FIELD) raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    const dto = parseVisitMaterialPayload(raw, UpdateVisitMaterialsPageDto);
    return this.updateService.execute(id, dto, toFilesDict(files));
  }

  @Delete(":id")
  @UseGuards(AdminRoleGuard)
  async remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteService.execute(id);
  }

  @Get()
  async findAll(
    @Query() query: QueryVisitMaterialsPageDto,
  ): Promise<VisitMaterialsPageResponseDTO[]> {
    return this.getService.findAll(query);
  }

  @Get("current-material")
  async findCurrentMaterial(): Promise<VisitMaterialsPageResponseDTO | null> {
    return this.getService.findCurrentWeek();
  }

  @Post("current-material/:id")
  @UseGuards(AdminRoleGuard)
  async setCurrentMaterial(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    return this.setCurrentService.execute(id);
  }

  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    return this.getService.findOne(id);
  }
}
