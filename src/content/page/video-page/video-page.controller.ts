import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  UploadedFiles,
  Body,
  UseInterceptors,
  BadRequestException,
  Logger,
  UseGuards,
  HttpException,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

/** Vídeos/imagens da página: até 10 arquivos de 200 MB. */
const VIDEO_PAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: 200 * 1024 * 1024, files: 10 },
} as const;
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateVideosPageDto } from "./dto/create-video-page.dto";
import { UpdateVideosPageDto } from "./dto/update-video-page.dto";
import { VideosPageResponseDto } from "./dto/video-page-response.dto";
import { CreateVideosPageService } from "./services/create-video-page.service";
import { UpdateVideosPageService } from "./services/update-video-page.service";
import { GetVideosPageService } from "./services/get-video-page.service";
import { DeleteVideosPageService } from "./services/delete-video-page.service";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("video-pages")
export class VideosPageController {
  private readonly logger = new Logger(VideosPageController.name);

  constructor(
    private readonly createService: CreateVideosPageService,
    private readonly updateService: UpdateVideosPageService,
    private readonly getService: GetVideosPageService,
    private readonly deleteService: DeleteVideosPageService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor(VIDEO_PAGE_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("videosPageData") raw: string,
  ): Promise<VideosPageResponseDto> {
    try {
      const parsedData: unknown = JSON.parse(raw);
      const dto = plainToInstance(CreateVideosPageDto, parsedData);

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

      this.logger.log("Creating new videos page");
      const result = await this.createService.execute(dto, filesDict);
      this.logger.log(`Videos page created successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error("Error creating videos page", error);
      throw new BadRequestException("Error creating videos page.");
    }
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(AnyFilesInterceptor(VIDEO_PAGE_UPLOAD_OPTIONS))
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("videosPageData") raw: string,
  ): Promise<VideosPageResponseDto> {
    try {
      const parsedData: unknown = JSON.parse(raw);
      const dto = plainToInstance(UpdateVideosPageDto, parsedData);

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

      this.logger.log(`Updating videos page: ${id}`);
      const result = await this.updateService.execute(id, dto, filesDict);
      this.logger.log(`Videos page updated successfully: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error("Error updating videos page", error);
      throw new BadRequestException("Error updating videos page.");
    }
  }

  /** Anônimo recebe só páginas públicas; com sessão, todas. */
  @FeatureFlag({
    anyOf: [
      FeatureFlagKeys.PUBLIC_VIDEOS,
      FeatureFlagKeys.TRAINING_VIDEOS,
      FeatureFlagKeys.PAGE_MANAGEMENT,
    ],
  })
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(@Req() req: Request): Promise<VideosPageResponseDto[]> {
    return this.getService.findAll(await this.getService.canSeeNonPublic(req));
  }

  @FeatureFlag({
    anyOf: [
      FeatureFlagKeys.PUBLIC_VIDEOS,
      FeatureFlagKeys.TRAINING_VIDEOS,
      FeatureFlagKeys.PAGE_MANAGEMENT,
    ],
  })
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<VideosPageResponseDto> {
    try {
      return await this.getService.findOne(
        id,
        await this.getService.canSeeNonPublic(req),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error("Error fetching videos page", err);
      throw new BadRequestException("Error fetching videos page.");
    }
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting videos page: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Videos page deleted successfully: ${id}`);
    return { message: "Página de vídeos removida com sucesso" };
  }
}
