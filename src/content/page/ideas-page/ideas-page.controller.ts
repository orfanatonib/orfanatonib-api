import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpException,
  Logger,
  ValidationPipe,
  Get,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

/** Mídias de ideias: até 10 arquivos de 200 MB (MIME validado no armazenamento quando migrado). */
const IDEAS_UPLOAD_OPTIONS = {
  limits: { fileSize: 200 * 1024 * 1024, files: 10 },
} as const;
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateIdeasPageDto } from "./dto/create-ideas-page.dto";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import { IdeasPageListQueryDto } from "./dto/ideas-page-list-query.dto";
import { IdeasPageResponseDto } from "./dto/ideas-page-response.dto";
import { UpdateIdeasPageDto } from "./dto/update-ideas-page.dto";

import { CreateIdeasPageService } from "./services/create-ideas-page.service";
import { DeleteIdeasPageService } from "./services/delete-ideas-page.service";
import { GetIdeasPageService } from "./services/get-ideas-page.service";
import { UpdateIdeasPageService } from "./services/update-ideas-page.service";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("ideas-pages")
export class IdeasPageController {
  private readonly logger = new Logger(IdeasPageController.name);

  constructor(
    private readonly createService: CreateIdeasPageService,
    private readonly deleteService: DeleteIdeasPageService,
    private readonly getService: GetIdeasPageService,
    private readonly updateService: UpdateIdeasPageService,
  ) {}

  @FeatureFlag([FeatureFlagKeys.PAGE_MANAGEMENT, FeatureFlagKeys.IDEAS_SHARING])
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor(IDEAS_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body("ideasMaterialsPageData") raw: string,
  ): Promise<IdeasPageResponseDto> {
    try {
      if (!raw) {
        throw new BadRequestException("ideasMaterialsPageData is required.");
      }

      const parsed: unknown = JSON.parse(raw);
      const validationPipe = new ValidationPipe({ transform: true });
      const dto = (await validationPipe.transform(parsed, {
        type: "body",
        metatype: CreateIdeasPageDto,
      })) as CreateIdeasPageDto;

      const filesDict: Record<string, Express.Multer.File> = {};
      files.forEach((f) => {
        filesDict[f.fieldname] = f;
      });

      this.logger.log("Creating new ideas page");
      const result = await this.createService.createIdeasPage(dto, filesDict);
      this.logger.log(`Ideas page created successfully: ${result.id}`);
      return result;
    } catch (err) {
      this.logger.error("Error creating ideas page", err);
      if (err instanceof HttpException && err.getStatus() < 500) throw err;
      throw new BadRequestException("Error creating ideas page.");
    }
  }

  @FeatureFlag([FeatureFlagKeys.PAGE_MANAGEMENT, FeatureFlagKeys.IDEAS_SHARING])
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(AnyFilesInterceptor(IDEAS_UPLOAD_OPTIONS))
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("ideasMaterialsPageData") raw: string,
  ): Promise<IdeasPageResponseDto> {
    try {
      if (!raw)
        throw new BadRequestException("ideasMaterialsPageData is required.");

      const parsedData: unknown = JSON.parse(raw);
      const dto = plainToInstance(UpdateIdeasPageDto, parsedData);
      const validationErrors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (validationErrors.length > 0) {
        this.logger.error(
          "Validation errors:",
          JSON.stringify(validationErrors, null, 2),
        );
        throw new BadRequestException("Invalid data in request");
      }

      const filesDict: Record<string, Express.Multer.File> = {};
      files.forEach((file) => (filesDict[file.fieldname] = file));

      this.logger.log(`Updating ideas page: ${id}`);
      const result = await this.updateService.updateIdeasPage(
        id,
        dto,
        filesDict,
      );
      this.logger.log(`Ideas page updated successfully: ${id}`);
      return result;
    } catch (error) {
      this.logger.error("Error updating ideas page", error);
      if (error instanceof HttpException && error.getStatus() < 500)
        throw error;
      throw new BadRequestException("Error updating ideas page.");
    }
  }

  @FeatureFlag([FeatureFlagKeys.PAGE_MANAGEMENT, FeatureFlagKeys.IDEAS_SHARING])
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<void> {
    try {
      this.logger.log(`Deleting ideas page: ${id}`);
      await this.deleteService.removeIdeasPage(id);
      this.logger.log(`Ideas page deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error("Error removing ideas page", error);
      if (error instanceof HttpException && error.getStatus() < 500)
        throw error;
      throw new BadRequestException("Erro ao remover a página de ideias.");
    }
  }

  /** Leitura só com sessão (qualquer perfil) e sob `ideas_sharing`; visitante anônimo recebe 401. */
  @FeatureFlag(FeatureFlagKeys.IDEAS_SHARING)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query() query: IdeasPageListQueryDto,
  ): Promise<
    IdeasPageResponseDto[] | PaginatedResponseDto<IdeasPageResponseDto>
  > {
    return this.getService.findList(query);
  }

  @FeatureFlag(FeatureFlagKeys.IDEAS_SHARING)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<IdeasPageResponseDto> {
    return this.getService.findPageWithMedia(id);
  }
}
