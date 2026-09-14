import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateImageSectionService } from "./services/update-image-section.service";
import { GetImageSectionService } from "./services/get-image-section.service";
import { DeleteImageSectionService } from "./services/delete-image-section.service";
import { CreateImageSectionService } from "./services/create-image-section.service";
import { ImageSectionResponseDto } from "./dto/image-section-response.dto";
import { CreateImageSectionDto } from "./dto/create-image-section.dto";
import { UpdateImageSectionDto } from "./dto/update-image-section.dto";

@Controller("image-sections")
export class ImageSectionController {
  private readonly logger = new Logger(ImageSectionController.name);

  constructor(
    private readonly createService: CreateImageSectionService,
    private readonly updateService: UpdateImageSectionService,
    private readonly getService: GetImageSectionService,
    private readonly deleteService: DeleteImageSectionService,
  ) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("sectionData") raw: string,
  ): Promise<ImageSectionResponseDto> {
    const dto = this.parseDto<CreateImageSectionDto>(
      raw,
      CreateImageSectionDto,
    );
    await this.validateDto(dto);

    const filesDict = this.mapFiles(files);
    this.logger.log("Creating new image section");
    const result = await this.createService.createSection(dto, filesDict);
    this.logger.log(`Image section created successfully: ${result.id}`);

    return result;
  }

  @Patch(":id")
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("sectionData") raw: string,
  ): Promise<ImageSectionResponseDto> {
    const dto = this.parseDto<UpdateImageSectionDto>(
      raw,
      UpdateImageSectionDto,
    );
    await this.validateDto(dto);

    const filesDict = this.mapFiles(files);
    this.logger.log(`Updating image section: ${id}`);
    const result = await this.updateService.updateSection(id, dto, filesDict);
    this.logger.log(`Image section updated successfully: ${id}`);

    return result;
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    this.logger.log(`Deleting image section: ${id}`);
    await this.deleteService.deleteSection(id);
    this.logger.log(`Image section deleted successfully: ${id}`);

    return { message: "Section removida com sucesso." };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<ImageSectionResponseDto> {
    const result = await this.getService.findOne(id);
    if (!result) {
      throw new NotFoundException(`Section com id=${id} não encontrada`);
    }

    return result;
  }

  @Get()
  async getAll(): Promise<ImageSectionResponseDto[]> {
    const result = await this.getService.findAll();
    return result;
  }

  private parseDto<T>(raw: string, dtoClass: new () => T): T {
    try {
      const obj = JSON.parse(raw);
      return plainToInstance(dtoClass, obj);
    } catch (error) {
      this.logger.error("Error parsing received JSON.", error);
      throw new BadRequestException("Invalid JSON format.");
    }
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      this.logger.error("Validation errors:", JSON.stringify(errors, null, 2));
      throw new BadRequestException("Invalid data in request.");
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
}
