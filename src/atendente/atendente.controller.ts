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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';
import { CreateAtendenteService } from './services/create-atendente.service';
import { UpdateAtendenteService } from './services/update-atendente.service';
import { DeleteAtendenteService } from './services/delete-atendente.service';
import { GetAtendenteService } from './services/get-atendente.service';
import { CreateAtendenteDto } from './dto/create-atendente.dto';
import { UpdateAtendenteDto } from './dto/update-atendente.dto';
import { QueryAtendenteDto } from './dto/query-atendente.dto';
import {
  AtendenteResponseDto,
  PaginatedAtendenteResponseDto,
} from './dto/atendente-response.dto';

const PDF_FIELDS = [
  { name: 'estadual', maxCount: 1 },
  { name: 'federal', maxCount: 1 },
] as const;

function toAtendenteFiles(
  files: { estadual?: Express.Multer.File[]; federal?: Express.Multer.File[] },
): { estadual?: Express.Multer.File; federal?: Express.Multer.File } {
  return {
    estadual: files?.estadual?.[0],
    federal: files?.federal?.[0],
  };
}

@Controller('antecedentes-criminais')
@UseGuards(JwtAuthGuard, AdminOrLeaderRoleGuard)
export class AtendenteController {
  private readonly logger = new Logger(AtendenteController.name);

  constructor(
    private readonly createService: CreateAtendenteService,
    private readonly updateService: UpdateAtendenteService,
    private readonly deleteService: DeleteAtendenteService,
    private readonly getService: GetAtendenteService,
  ) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([...PDF_FIELDS]))
  async create(
    @UploadedFiles() uploadedFiles: { estadual?: Express.Multer.File[]; federal?: Express.Multer.File[] },
    @Body('atendenteData') atendenteDataRaw?: string,
  ): Promise<AtendenteResponseDto> {
    try {
      if (!atendenteDataRaw) {
        throw new BadRequestException('Field "atendenteData" is required.');
      }
      const parsed = JSON.parse(atendenteDataRaw);
      const dto = plainToInstance(CreateAtendenteDto, parsed);
      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error('Validation errors:', JSON.stringify(errors, null, 2));
        throw new BadRequestException('Invalid data in request');
      }
      const files = toAtendenteFiles(uploadedFiles ?? {});
      this.logger.log('Creating new antecedente criminal');
      const result = await this.createService.execute(dto, files);
      this.logger.log(`Antecedente criminal created successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error creating antecedente criminal', error);
      throw new BadRequestException('Error creating antecedente criminal.');
    }
  }

  @Get()
  async findAllPaginated(
    @Query() query: QueryAtendenteDto,
  ): Promise<PaginatedAtendenteResponseDto> {
    return this.getService.findAllPaginated(query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AtendenteResponseDto> {
    return this.getService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([...PDF_FIELDS]))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() uploadedFiles: { estadual?: Express.Multer.File[]; federal?: Express.Multer.File[] },
    @Body('atendenteData') atendenteDataRaw?: string,
  ): Promise<AtendenteResponseDto> {
    try {
      if (!atendenteDataRaw) {
        throw new BadRequestException('Field "atendenteData" is required.');
      }
      const parsed = JSON.parse(atendenteDataRaw);
      const dto = plainToInstance(UpdateAtendenteDto, parsed);
      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error('Validation errors:', JSON.stringify(errors, null, 2));
        throw new BadRequestException('Invalid data in request');
      }
      const files = toAtendenteFiles(uploadedFiles ?? {});
      this.logger.log(`Updating antecedente criminal: ${id}`);
      const result = await this.updateService.execute(id, dto, files);
      this.logger.log(`Antecedente criminal updated successfully: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error updating antecedente criminal', error);
      throw new BadRequestException('Error updating antecedente criminal.');
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Deleting antecedente criminal: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Antecedente criminal deleted successfully: ${id}`);
  }
}
