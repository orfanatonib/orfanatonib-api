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
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";

import { CreateShelteredDto } from "./dto/create-sheltered.dto";
import { UpdateShelteredDto } from "./dto/update-sheltered.dto";
import { UpdateShelteredStatusDto } from "./dto/update-sheltered-status.dto";
import { QueryShelteredDto } from "./dto/query-sheltered.dto";
import { QueryShelteredSimpleDto } from "./dto/query-sheltered-simple.dto";
import {
  ShelteredListItemDto,
  ShelteredResponseDto,
} from "./dto/sheltered-response.dto";
import { CreateShelteredService } from "./services/create-sheltered.service";
import { GetShelteredService } from "./services/get-sheltered.service";
import { UpdateShelteredService } from "./services/update-sheltered.service";
import { DeleteShelteredService } from "./services/delete-sheltered.service";
import { toShelteredAccessContext } from "./utils/sheltered-access.util";

@Controller("sheltered")
@UseGuards(JwtAuthGuard)
export class ShelteredController {
  constructor(
    private readonly createShelteredService: CreateShelteredService,
    private readonly getShelteredService: GetShelteredService,
    private readonly updateShelteredService: UpdateShelteredService,
    private readonly deleteShelteredService: DeleteShelteredService,
  ) {}

  @Get()
  async findAll(
    @Query() query: QueryShelteredDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<ShelteredResponseDto>> {
    return this.getShelteredService.findAll(
      query,
      toShelteredAccessContext(request),
    );
  }

  @Get("simple")
  async findAllSimple(
    @Query() query: QueryShelteredSimpleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<ShelteredListItemDto>> {
    return this.getShelteredService.findAllSimple(
      query,
      toShelteredAccessContext(request),
    );
  }

  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelteredResponseDto> {
    return this.getShelteredService.findOne(
      id,
      toShelteredAccessContext(request),
    );
  }

  @Post()
  async create(
    @Body() dto: CreateShelteredDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelteredResponseDto> {
    return this.createShelteredService.execute(
      dto,
      toShelteredAccessContext(request),
    );
  }

  @Put(":id")
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShelteredDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelteredResponseDto> {
    return this.updateShelteredService.execute(
      id,
      dto,
      toShelteredAccessContext(request),
    );
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShelteredStatusDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelteredResponseDto> {
    return this.updateShelteredService.updateStatus(
      id,
      dto.active,
      toShelteredAccessContext(request),
    );
  }

  @Delete(":id")
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteShelteredService.execute(
      id,
      toShelteredAccessContext(request),
    );
  }
}
