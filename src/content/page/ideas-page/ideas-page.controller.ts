import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Logger,
  ValidationPipe,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateIdeasPageDto } from "./dto/create-ideas-page.dto";
import { IdeasPageResponseDto } from "./dto/ideas-page-response.dto";
import { UpdateIdeasPageDto } from "./dto/update-ideas-page.dto";

import { CreateIdeasPageService } from "./services/create-ideas-page.service";
import { DeleteIdeasPageService } from "./services/delete-ideas-page.service";
import { GetIdeasPageService } from "./services/get-ideas-page.service";
import { UpdateIdeasPageService } from "./services/update-ideas-page.service";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";

@Controller("ideas-pages")
export class IdeasPageController {
  private readonly logger = new Logger(IdeasPageController.name);

  constructor(
    private readonly createService: CreateIdeasPageService,
    private readonly deleteService: DeleteIdeasPageService,
    private readonly getService: GetIdeasPageService,
    private readonly updateService: UpdateIdeasPageService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body("ideasMaterialsPageData") raw: string,
  ): Promise<IdeasPageResponseDto> {
    try {
      if (!raw) {
        throw new BadRequestException("ideasMaterialsPageData is required.");
      }

      const parsed = JSON.parse(raw);
      const validationPipe = new ValidationPipe({ transform: true });
      const dto: CreateIdeasPageDto = await validationPipe.transform(parsed, {
        type: "body",
        metatype: CreateIdeasPageDto,
      });

      const filesDict: Record<string, Express.Multer.File> = {};
      files.forEach((f) => {
        filesDict[f.fieldname] = f;
      });

      this.logger.log("Creating new ideas page");
      const result = await this.createService.createIdeasPage(
        dto,
        filesDict,
      );
      this.logger.log(`Ideas page created successfully: ${result.id}`);
      return result;
    } catch (err) {
      this.logger.error("Error creating ideas page", err);
      throw new BadRequestException(
        "Error creating ideas page: " + err.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("ideasMaterialsPageData") raw: string,
  ): Promise<IdeasPageResponseDto> {
    try {
      if (!raw)
        throw new BadRequestException("ideasMaterialsPageData is required.");

      const parsedData = JSON.parse(raw);
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
      return IdeasPageResponseDto.fromEntity(result, new Map());
    } catch (error) {
      this.logger.error("Error updating ideas page", error);
      throw new BadRequestException("Error updating ideas page.");
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<void> {
    try {
      this.logger.log(`Deleting ideas page: ${id}`);
      await this.deleteService.removeIdeasPage(id);
      this.logger.log(`Ideas page deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error("Error removing ideas page", error);
      throw new BadRequestException(
        "Erro ao remover a página de ideias: " + error.message,
      );
    }
  }

  @Get()
  async findAll(): Promise<IdeasPageResponseDto[]> {
    return this.getService.findAllPagesWithMedia();
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<IdeasPageResponseDto> {
    return this.getService.findPageWithMedia(id);
  }
}
