import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
  Logger,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SiteFeedbackService } from './site-feedback.service';
import { CreateSiteFeedbackDto } from './dto/create-site-feedback.dto';
import { SiteFeedbackResponseDto } from './dto/site-feedback-response.dto';
import { UpdateSiteFeedbackDto } from './dto/update-site-feedback.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';

@Controller('site-feedbacks')
export class SiteFeedbackController {
  private readonly logger = new Logger(SiteFeedbackController.name);

  constructor(private readonly siteFeedbackService: SiteFeedbackService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateSiteFeedbackDto): Promise<SiteFeedbackResponseDto> {
    const created = await this.siteFeedbackService.create(dto);
    return plainToInstance(SiteFeedbackResponseDto, created);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findAll(): Promise<SiteFeedbackResponseDto[]> {
    const feedbacks = await this.siteFeedbackService.findAll();
    return plainToInstance(SiteFeedbackResponseDto, feedbacks);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findOne(@Param('id') id: string): Promise<SiteFeedbackResponseDto> {
    const feedback = await this.siteFeedbackService.findOne(id);
    return plainToInstance(SiteFeedbackResponseDto, feedback);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteFeedbackDto,
  ): Promise<SiteFeedbackResponseDto> {
    const updated = await this.siteFeedbackService.update(id, dto);
    return plainToInstance(SiteFeedbackResponseDto, updated);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param('id') id: string): Promise<void> {
    await this.siteFeedbackService.remove(id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(@Param('id') id: string): Promise<SiteFeedbackResponseDto> {
    const feedback = await this.siteFeedbackService.setReadOnFeedback(id);
    return plainToInstance(SiteFeedbackResponseDto, feedback);
  }
}
