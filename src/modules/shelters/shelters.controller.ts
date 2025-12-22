import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Patch,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

import { DeleteSheltersService } from './services/delete-shelters.service';
import { UpdateSheltersService } from './services/update-shelters.service';
import { GetSheltersService } from './services/get-shelters.service';
import { CreateSheltersService } from './services/create-shelters.service';

import { QuerySheltersDto } from './dto/query-shelters.dto';
import { Paginated } from 'src/share/dto/paginated.dto';
import { ShelterResponseDto, ShelterSimpleResponseDto, toShelterDto } from './dto/shelter.response.dto';
import { ShelterSelectOptionDto } from './dto/shelter-select-option.dto';
import { ShelterTeamsQuantityResponseDto } from './dto/shelter-teams-quantity-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('shelters')
@UseGuards(JwtAuthGuard)
export class SheltersController {
  private readonly logger = new Logger(SheltersController.name);

  constructor(
    private readonly deleteService: DeleteSheltersService,
    private readonly updateService: UpdateSheltersService,
    private readonly getService: GetSheltersService,
    private readonly createService: CreateSheltersService,
  ) {}

  @Get()
  findAllPaginated(
    @Query() q: QuerySheltersDto,
    @Req() req: Request,
  ): Promise<Paginated<ShelterResponseDto>> {
    return this.getService.findAllPaginated(q, req);
  }

  @Get('simple')
  async findAllSimple(@Req() req: Request): Promise<ShelterSimpleResponseDto[]> {
    return this.getService.findAllSimple(req);
  }

  @Get('list')
  async list(@Req() req: Request): Promise<ShelterSelectOptionDto[]> {
    return this.getService.list(req);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<ShelterResponseDto> {
    return this.getService.findOne(id, req);
  }

  @Get(':id/teams-quantity')
  async getTeamsQuantity(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<ShelterTeamsQuantityResponseDto> {
    return this.getService.getTeamsQuantity(id, req);
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req: Request,
    @Body('shelterData') shelterDataRaw?: string,
  ): Promise<ShelterResponseDto> {
    const bodyToProcess = shelterDataRaw ? { shelterData: shelterDataRaw } : {};
    const entity = await this.createService.createFromRaw(bodyToProcess, files, req);
    return toShelterDto(entity);
  }

  @Put(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req: Request,
    @Body('shelterData') shelterDataRaw?: string,
    @Body() body?: any,
  ): Promise<ShelterResponseDto> {
    const bodyToProcess = shelterDataRaw ? { shelterData: shelterDataRaw } : (body || {});
    const entity = await this.updateService.updateFromRaw(id, bodyToProcess, files, req);
    return toShelterDto(entity);
  }

  @Patch(':id/media')
  @UseInterceptors(AnyFilesInterceptor())
  async updateMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req: Request,
    @Body('mediaData') mediaDataRaw?: string,
    @Body() body?: any,
  ): Promise<ShelterResponseDto> {
    const bodyToProcess = mediaDataRaw ? { mediaData: mediaDataRaw } : (body || {});
    const entity = await this.updateService.updateMediaFromRaw(id, bodyToProcess, files, req);
    return toShelterDto(entity);
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.deleteService.remove(id, req);
  }

}