import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { CreatePagelaService } from "./services/create-pagela.service";
import { GetPagelasService } from "./services/get-pagelas.service";
import { UpdatePagelaService } from "./services/update-pagela.service";
import { DeletePagelaService } from "./services/delete-pagela.service";
import { CreatePagelaDto } from "./dto/create-pagela.dto";
import { UpdatePagelaDto } from "./dto/update-pagela.dto";
import { PagelaFiltersDto } from "./dto/pagela-filters.dto";
import { PaginationQueryDto, PaginatedResponse } from "./dto/paginated.dto";
import { PagelaResponseDto } from "./dto/pagela-response.dto";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";

@Controller("pagelas")
@UseGuards(JwtAuthGuard)
export class PagelasController {
  private readonly logger = new Logger(PagelasController.name);

  constructor(
    private readonly createPagelaService: CreatePagelaService,
    private readonly getPagelasService: GetPagelasService,
    private readonly updatePagelaService: UpdatePagelaService,
    private readonly deletePagelaService: DeletePagelaService,
  ) {}

  @Post()
  async create(@Body() dto: CreatePagelaDto): Promise<PagelaResponseDto> {
    this.logger.log("Creating new pagela");
    const result = await this.createPagelaService.execute(dto);
    this.logger.log(`Pagela created successfully: ${result.id}`);
    return result;
  }

  @Get()
  async findAllSimple(
    @Query() filters: PagelaFiltersDto,
  ): Promise<PagelaResponseDto[]> {
    return this.getPagelasService.findAllSimple(filters);
  }

  @Get("paginated")
  async findAllPaginated(
    @Query() query: PagelaFiltersDto & PaginationQueryDto,
  ): Promise<PaginatedResponse<PagelaResponseDto>> {
    const { page = 1, limit = 20, ...filters } = query;
    return this.getPagelasService.findAllPaginated(filters, page, limit);
  }

  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<PagelaResponseDto> {
    return this.getPagelasService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePagelaDto,
  ): Promise<PagelaResponseDto> {
    this.logger.log(`Updating pagela: ${id}`);
    const result = await this.updatePagelaService.execute(id, dto);
    this.logger.log(`Pagela updated successfully: ${id}`);
    return result;
  }

  @Delete(":id")
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    this.logger.log(`Deleting pagela: ${id}`);
    await this.deletePagelaService.execute(id);
    this.logger.log(`Pagela deleted successfully: ${id}`);
  }
}
