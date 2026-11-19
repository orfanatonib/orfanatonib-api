import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { MEDIA_PAGE_UPLOAD_OPTIONS } from "src/shared/media/storage/upload-limits.constants";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

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

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor(MEDIA_PAGE_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body(VISIT_MATERIAL_PAYLOAD_FIELD) raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    // The payload rides a multipart text field, so the global ValidationPipe
    // never sees it; parsing and validating it stays a transport concern.
    const dto = parseVisitMaterialPayload(raw, CreateVisitMaterialsPageDto);
    return this.createService.execute(dto, toFilesDict(files));
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id")
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(AnyFilesInterceptor(MEDIA_PAGE_UPLOAD_OPTIONS))
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(VISIT_MATERIAL_PAYLOAD_FIELD) raw: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    const dto = parseVisitMaterialPayload(raw, UpdateVisitMaterialsPageDto);
    return this.updateService.execute(id, dto, toFilesDict(files));
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminRoleGuard)
  async remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteService.execute(id);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_MATERIALS)
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(
    @Query() query: QueryVisitMaterialsPageDto,
  ): Promise<VisitMaterialsPageResponseDTO[]> {
    return this.getService.findAll(query);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_MATERIALS)
  @UseGuards(FeatureFlagGuard)
  @Get("current-material")
  async findCurrentMaterial(): Promise<VisitMaterialsPageResponseDTO | null> {
    return this.getService.findCurrentWeek();
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Post("current-material/:id")
  @UseGuards(AdminRoleGuard)
  async setCurrentMaterial(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    return this.setCurrentService.execute(id);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_MATERIALS)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<VisitMaterialsPageResponseDTO> {
    return this.getService.findOne(id);
  }
}
