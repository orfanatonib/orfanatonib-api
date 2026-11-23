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
  NotFoundException,
  Query,
  Req,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { ImagePageResponseDto } from "./dto/image-page-response.dto";
import { CreateImagePageDto } from "./dto/create-image.dto";
import { UpdateImagePageDto } from "./dto/update-image.dto";
import { CreateImagePageService } from "./services/create-image-page.service";
import { DeleteImagePageService } from "./services/delete-image-page.service";
import { GetImagePageService } from "./services/get-image-page.service";
import { UpdateImagePageService } from "./services/update-image-page.service";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { PaginatedImageSectionResponseDto } from "./dto/paginated-image-section.dto";
import { Request } from "express";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import { PageListQueryDto } from "../page-list-query";
import { IMAGE_GALLERY_UPLOAD_OPTIONS } from "src/shared/media/storage/upload-limits.constants";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

interface RawImagePageData {
  sections?: Array<{ mediaItems?: Array<{ file?: unknown }> }>;
}

const DEFAULT_SECTIONS_PAGE_SIZE = 2;
const MAX_SECTIONS_PAGE_SIZE = 50;

@Controller("image-pages")
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor(
    private readonly createService: CreateImagePageService,
    private readonly deleteService: DeleteImagePageService,
    private readonly getService: GetImagePageService,
    private readonly updateService: UpdateImagePageService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor(IMAGE_GALLERY_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("imageData") raw: string,
  ): Promise<ImagePageResponseDto> {
    try {
      const dto = plainToInstance(CreateImagePageDto, JSON.parse(raw));
      await this.validateDto(dto);

      const filesDict = this.mapFiles(files);

      this.logger.log("Creating new image page");
      const result = await this.createService.createImagePage(dto, filesDict);
      this.logger.log(`Image page created successfully: ${result.id}`);

      return result;
    } catch (error) {
      this.logger.error("Error creating gallery", error);
      throw new BadRequestException("Erro ao criar a galeria.");
    }
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(AnyFilesInterceptor(IMAGE_GALLERY_UPLOAD_OPTIONS))
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("imageData") raw: string,
  ): Promise<ImagePageResponseDto> {
    try {
      const rawObject = JSON.parse(raw) as RawImagePageData;
      this.cleanMediaFiles(rawObject);

      const dto = plainToInstance(UpdateImagePageDto, rawObject);
      await this.validateDto(dto);

      const filesDict = this.mapFiles(files);

      this.logger.log(`Updating image page: ${id}`);
      const result = await this.updateService.updateImagePage(
        id,
        dto,
        filesDict,
      );
      this.logger.log(`Image page updated successfully: ${id}`);
      return result;
    } catch (error) {
      this.logger.error("Error updating gallery", error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Erro ao atualizar a galeria.");
    }
  }

  /** Anônimo recebe só galerias públicas; com sessão, todas. */
  @FeatureFlag(FeatureFlagKeys.PUBLIC_GALLERIES)
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: PageListQueryDto,
  ): Promise<
    ImagePageResponseDto[] | PaginatedResponseDto<ImagePageResponseDto>
  > {
    return this.getService.findList(
      await this.getService.canSeeNonPublic(req),
      query,
    );
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_FEED)
  @UseGuards(FeatureFlagGuard)
  @Get(":id/sections")
  async getPaginatedSections(
    @Param("id") pageId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "2",
    @Req() req: Request,
  ): Promise<PaginatedImageSectionResponseDto> {
    // Entrada de query é texto livre: sem NaN, sem página < 1, com teto de limite.
    const pageNumber = Math.max(1, Math.floor(Number(page)) || 1);
    const limitNumber = Math.min(
      MAX_SECTIONS_PAGE_SIZE,
      Math.max(1, Math.floor(Number(limit)) || DEFAULT_SECTIONS_PAGE_SIZE),
    );

    return this.getService.findSectionsPaginated(
      pageId,
      pageNumber,
      limitNumber,
      req,
    );
  }

  @FeatureFlag(FeatureFlagKeys.PUBLIC_GALLERIES)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<ImagePageResponseDto> {
    try {
      return await this.getService.findOne(
        id,
        await this.getService.canSeeNonPublic(req),
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Error fetching gallery.");
    }
  }

  @FeatureFlag(FeatureFlagKeys.PAGE_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    this.logger.log(`Deleting image page: ${id}`);
    await this.deleteService.removePage(id);
    this.logger.log(`Image page deleted successfully: ${id}`);
    return { message: "Gallery page removed successfully" };
  }

  private async validateDto(dto: object) {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      this.logger.error("Validation errors:", JSON.stringify(errors, null, 2));
      throw new BadRequestException("Invalid data in request");
    }
  }

  private mapFiles(
    files: Express.Multer.File[],
  ): Record<string, Express.Multer.File> {
    return files.reduce(
      (acc, file) => {
        acc[file.fieldname] = file;
        return acc;
      },
      {} as Record<string, Express.Multer.File>,
    );
  }

  /** O cliente pode mandar o `File` dentro do JSON; ele chega por multipart, não no corpo. */
  private cleanMediaFiles(rawObject: RawImagePageData): void {
    rawObject.sections?.forEach((section) =>
      section.mediaItems?.forEach((media) => {
        delete media.file;
      }),
    );
  }
}
