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
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { CreateSiteFeedbackService } from "./services/create-site-feedback.service";
import { GetSiteFeedbackService } from "./services/get-site-feedback.service";
import { UpdateSiteFeedbackService } from "./services/update-site-feedback.service";
import { DeleteSiteFeedbackService } from "./services/delete-site-feedback.service";
import { CreateSiteFeedbackDto } from "./dto/create-site-feedback.dto";
import { SiteFeedbackPendingCountDto } from "./dto/site-feedback-pending-count.dto";
import { SiteFeedbackResponseDto } from "./dto/site-feedback-response.dto";
import { UpdateSiteFeedbackDto } from "./dto/update-site-feedback.dto";
import { QuerySiteFeedbackDto } from "./dto/query-site-feedback.dto";
import { SiteFeedbackSortBy } from "./enums/site-feedback-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("site-feedbacks")
export class SiteFeedbackController {
  private readonly logger = new Logger(SiteFeedbackController.name);

  constructor(
    private readonly createFeedbackService: CreateSiteFeedbackService,
    private readonly getFeedbackService: GetSiteFeedbackService,
    private readonly updateFeedbackService: UpdateSiteFeedbackService,
    private readonly deleteFeedbackService: DeleteSiteFeedbackService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.SITE_FEEDBACK)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Body() dto: CreateSiteFeedbackDto,
  ): Promise<SiteFeedbackResponseDto> {
    this.logger.log("Creating new site feedback");
    const created = await this.createFeedbackService.execute(dto);
    this.logger.log(`Site feedback created successfully: ${created.id}`);
    return plainToInstance(SiteFeedbackResponseDto, created);
  }

  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findAll(
    @Query() query: QuerySiteFeedbackDto,
  ): Promise<
    SiteFeedbackResponseDto[] | PaginatedResponseDto<SiteFeedbackResponseDto>
  > {
    const { items, total } = await this.getFeedbackService.findFiltered(query);
    const data = plainToInstance(SiteFeedbackResponseDto, items);
    // Sem `page` continua o array de sempre; com `page`, `{ data, meta }` paginado no banco.
    return isPaginated(query)
      ? toPaginated(
          data,
          query,
          total,
          query.sortBy ?? SiteFeedbackSortBy.CREATED_AT,
        )
      : data;
  }

  /** Selo do painel do admin: quantos feedbacks ainda não foram lidos. */
  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get("pending-count")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async pendingCount(): Promise<SiteFeedbackPendingCountDto> {
    return this.getFeedbackService.pendingCount();
  }

  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<SiteFeedbackResponseDto> {
    const feedback = await this.getFeedbackService.findOne(id);
    return plainToInstance(SiteFeedbackResponseDto, feedback);
  }

  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteFeedbackDto,
  ): Promise<SiteFeedbackResponseDto> {
    this.logger.log(`Updating site feedback: ${id}`);
    const updated = await this.updateFeedbackService.update(id, dto);
    this.logger.log(`Site feedback updated successfully: ${id}`);
    return plainToInstance(SiteFeedbackResponseDto, updated);
  }

  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Deleting site feedback: ${id}`);
    await this.deleteFeedbackService.remove(id);
    this.logger.log(`Site feedback deleted successfully: ${id}`);
  }

  @FeatureFlag(FeatureFlagKeys.FEEDBACK_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id/read")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<SiteFeedbackResponseDto> {
    this.logger.log(`Marking site feedback as read: ${id}`);
    const feedback = await this.updateFeedbackService.setReadOnFeedback(id);
    this.logger.log(`Site feedback marked as read successfully: ${id}`);
    return plainToInstance(SiteFeedbackResponseDto, feedback);
  }
}
