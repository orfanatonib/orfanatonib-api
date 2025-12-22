import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ShelteredService } from './sheltered.service';
import { CreateShelteredDto } from './dto/create-sheltered.dto';
import { UpdateShelteredDto } from './dto/update-sheltered.dto';
import { UpdateShelteredStatusDto } from './dto/update-sheltered-status.dto';
import { QueryShelteredDto, QueryShelteredSimpleDto } from './dto/query-sheltered.dto';
import { PaginatedResponseDto, ShelteredResponseDto, ShelteredListItemDto } from './dto/sheltered-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('sheltered')
@UseGuards(JwtAuthGuard)
export class ShelteredController {
  constructor(private readonly service: ShelteredService) { }

  @Get()
  async findAll(
    @Query() query: QueryShelteredDto,
    @Req() req: Request,
  ): Promise<PaginatedResponseDto<ShelteredResponseDto>> {
    return this.service.findAll(query, req);
  }

  @Get('simple')
  async findAllSimples(
    @Query() query: QueryShelteredSimpleDto,
    @Req() req: Request,
  ): Promise<PaginatedResponseDto<ShelteredListItemDto>> {
    return this.service.findAllSimples(query, req);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<ShelteredResponseDto> {
    return this.service.findOne(id, req);
  }

  @Post()
  async create(
    @Body() dto: CreateShelteredDto,
    @Req() req: Request,
  ): Promise<ShelteredResponseDto> {
    return this.service.create(dto, req);
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShelteredDto,
    @Req() req: Request,
  ): Promise<ShelteredResponseDto> {
    return this.service.update(id, dto, req);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShelteredStatusDto,
    @Req() req: Request,
  ): Promise<ShelteredResponseDto> {
    return this.service.updateStatus(id, dto.active, req);
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.remove(id, req);
  }
}