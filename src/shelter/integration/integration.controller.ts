import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Logger,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpException,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

/** Fotos da integração: até 10 arquivos de 10 MB (MIME validado no MediaStorageService). */
const INTEGRATION_UPLOAD_OPTIONS = {
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
} as const;
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateIntegrationService } from "./services/create-integration.service";
import { GetIntegrationService } from "./services/get-integration.service";
import { UpdateIntegrationService } from "./services/update-integration.service";
import { DeleteIntegrationService } from "./services/delete-integration.service";
import { CreateIntegrationDto } from "./dto/create-integration.dto";
import { UpdateIntegrationDto } from "./dto/update-integration.dto";
import {
  IntegrationResponseDto,
  PaginatedResponseDto,
} from "./dto/integration-response.dto";
import { QueryIntegrationDto } from "./dto/query-integration.dto";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";

@Controller("integrations")
@UseGuards(JwtAuthGuard, AdminOrLeaderRoleGuard)
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(
    private readonly createService: CreateIntegrationService,
    private readonly getService: GetIntegrationService,
    private readonly updateService: UpdateIntegrationService,
    private readonly deleteService: DeleteIntegrationService,
  ) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor(INTEGRATION_UPLOAD_OPTIONS))
  async create(
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @Body("integrationData") integrationDataRaw?: string,
  ): Promise<IntegrationResponseDto> {
    try {
      if (!integrationDataRaw) {
        throw new BadRequestException('Field "integrationData" is required.');
      }

      const parsed: unknown = JSON.parse(integrationDataRaw);
      const dto = plainToInstance(CreateIntegrationDto, parsed);

      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error(
          "Validation errors:",
          JSON.stringify(errors, null, 2),
        );
        throw new BadRequestException("Invalid data in request");
      }

      const files: Express.Multer.File[] = [];
      if (uploadedFiles) {
        const fileMap = new Map<number, Express.Multer.File>();
        uploadedFiles.forEach((file) => {
          const match = file.fieldname.match(/^files\[(\d+)\]$/);
          if (match) {
            const index = parseInt(match[1]);
            fileMap.set(index, file);
          }
        });

        const sortedIndices = Array.from(fileMap.keys()).sort((a, b) => a - b);
        sortedIndices.forEach((index) => {
          files.push(fileMap.get(index)!);
        });
      }

      this.logger.log(`Creating new integration: ${dto.name}`);
      const result = await this.createService.execute(dto, files);
      this.logger.log(`Integration created successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error("Error creating integration", error);
      throw new BadRequestException("Error creating integration.");
    }
  }

  @Get()
  async findAllPaginated(
    @Query() query: QueryIntegrationDto,
  ): Promise<PaginatedResponseDto<IntegrationResponseDto>> {
    return this.getService.findAllPaginated(query);
  }

  @Get("simple")
  async findAll(): Promise<IntegrationResponseDto[]> {
    return this.getService.findAll();
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<IntegrationResponseDto> {
    return this.getService.findOne(id);
  }

  @Put(":id")
  @UseInterceptors(AnyFilesInterceptor(INTEGRATION_UPLOAD_OPTIONS))
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @Body("integrationData") integrationDataRaw?: string,
  ): Promise<IntegrationResponseDto> {
    try {
      if (!integrationDataRaw) {
        throw new BadRequestException('Field "integrationData" is required.');
      }

      const parsed: unknown = JSON.parse(integrationDataRaw);
      const dto = plainToInstance(UpdateIntegrationDto, parsed);

      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error(
          "Validation errors:",
          JSON.stringify(errors, null, 2),
        );
        throw new BadRequestException("Invalid data in request");
      }

      const files: Express.Multer.File[] = [];
      if (uploadedFiles) {
        const fileMap = new Map<number, Express.Multer.File>();
        uploadedFiles.forEach((file) => {
          const match = file.fieldname.match(/^files\[(\d+)\]$/);
          if (match) {
            const index = parseInt(match[1]);
            fileMap.set(index, file);
          }
        });

        const sortedIndices = Array.from(fileMap.keys()).sort((a, b) => a - b);
        sortedIndices.forEach((index) => {
          files.push(fileMap.get(index)!);
        });
      }

      this.logger.log(`Updating integration: ${id}`);
      const result = await this.updateService.execute(id, dto, files);
      this.logger.log(`Integration updated successfully: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error("Error updating integration", error);
      throw new BadRequestException("Error updating integration.");
    }
  }

  @Delete(":id")
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Deleting integration: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Integration deleted successfully: ${id}`);
  }
}
