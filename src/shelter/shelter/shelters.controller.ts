import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

import { CreateSheltersService } from "./services/create-shelters.service";
import { GetSheltersService } from "./services/get-shelters.service";
import { UpdateSheltersService } from "./services/update-shelters.service";
import { DeleteSheltersService } from "./services/delete-shelters.service";

import { CreateShelterDto } from "./dto/create-shelter.dto";
import { UpdateShelterDto } from "./dto/update-shelter.dto";
import { QuerySheltersDto } from "./dto/query-shelters.dto";
import {
  ShelterResponseDto,
  ShelterSimpleResponseDto,
} from "./dto/shelter.response.dto";
import { ShelterPaginatedResponseDto } from "./dto/shelter-paginated-response.dto";
import { ShelterSelectOptionDto } from "./dto/shelter-select-option.dto";
import { ShelterTeamSelectOptionDto } from "./dto/shelter-team-select-option.dto";
import { ShelterTeamsQuantityResponseDto } from "./dto/shelter-teams-quantity-response.dto";
import { toShelterAccessContext } from "./utils/shelter-access.util";
import {
  parseShelterMediaPayload,
  parseShelterPayload,
  toFilesDict,
  type ShelterMediaRawBody,
  type ShelterRawBody,
} from "./utils/shelter-payload.util";
import { IMAGE_UPLOAD_OPTIONS } from "src/shared/media/storage/upload-limits.constants";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";

@Controller("shelters")
export class SheltersController {
  constructor(
    private readonly createService: CreateSheltersService,
    private readonly getService: GetSheltersService,
    private readonly updateService: UpdateSheltersService,
    private readonly deleteService: DeleteSheltersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAllPaginated(
    @Query() query: QuerySheltersDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterPaginatedResponseDto<ShelterResponseDto>> {
    return this.getService.findAllPaginated(
      query,
      toShelterAccessContext(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("simple")
  findAllSimple(
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterSimpleResponseDto[]> {
    return this.getService.findAllSimple(toShelterAccessContext(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  list(
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterSelectOptionDto[]> {
    return this.getService.list(toShelterAccessContext(request));
  }

  @FeatureFlag(FeatureFlagKeys.PUBLIC_REGISTRATION)
  @UseGuards(FeatureFlagGuard)
  @Get("list-teams")
  listTeamsForPublic(): Promise<ShelterTeamSelectOptionDto[]> {
    return this.getService.listTeamsForPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterResponseDto> {
    return this.getService.findOne(id, toShelterAccessContext(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/teams-quantity")
  getTeamsQuantity(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterTeamsQuantityResponseDto> {
    return this.getService.getTeamsQuantity(
      id,
      toShelterAccessContext(request),
    );
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor(IMAGE_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() request: AuthenticatedRequest,
    @Body() body: ShelterRawBody,
  ): Promise<ShelterResponseDto> {
    // O JSON vem num campo multipart que o ValidationPipe global não alcança.
    const dto = parseShelterPayload(body, CreateShelterDto);
    const shelter = await this.createService.execute(
      dto,
      toShelterAccessContext(request),
      toFilesDict(files),
    );

    return this.getService.toResponse(shelter);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Put(":id")
  @UseInterceptors(AnyFilesInterceptor(IMAGE_UPLOAD_OPTIONS))
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() request: AuthenticatedRequest,
    @Body() body: ShelterRawBody,
  ): Promise<ShelterResponseDto> {
    const dto = parseShelterPayload(body, UpdateShelterDto);
    const shelter = await this.updateService.execute(
      id,
      dto,
      toShelterAccessContext(request),
      toFilesDict(files),
    );

    return this.getService.toResponse(shelter);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Patch(":id/media")
  @UseInterceptors(AnyFilesInterceptor(IMAGE_UPLOAD_OPTIONS))
  async updateMedia(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() request: AuthenticatedRequest,
    @Body() body: ShelterMediaRawBody,
  ): Promise<ShelterResponseDto> {
    const media = parseShelterMediaPayload(body);
    const shelter = await this.updateService.updateMedia(
      id,
      media,
      toShelterAccessContext(request),
      toFilesDict(files),
    );

    return this.getService.toResponse(shelter);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.deleteService.execute(id, toShelterAccessContext(request));
  }
}
