import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { UserRole } from "src/core/auth/auth.types";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { normalizeRole } from "src/core/auth/utils/auth-token.util";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { UnauthenticatedException } from "src/common/exceptions";
import {
  FEED_COMMENT_ITEMS_ROUTE,
  FEED_COMMENT_MESSAGES,
  FEED_COMMENT_SECTIONS_ROUTE,
} from "./constants";
import { CreateFeedCommentDto } from "./dto/create-feed-comment.dto";
import {
  FeedCommentPendingCountResponseDto,
  FeedCommentResponseDto,
  PaginatedFeedCommentsResponseDto,
  PaginatedModerationFeedCommentsResponseDto,
} from "./dto/feed-comment-response.dto";
import { ModerationFeedCommentsQueryDto } from "./dto/moderation-feed-comments-query.dto";
import { RejectFeedCommentDto } from "./dto/reject-feed-comment.dto";
import { ListFeedCommentsQueryDto } from "./dto/list-feed-comments-query.dto";
import { CreateFeedCommentService } from "./services/create-feed-comment.service";
import { DeleteFeedCommentService } from "./services/delete-feed-comment.service";
import { GetFeedCommentService } from "./services/get-feed-comment.service";
import { UpdateFeedCommentService } from "./services/update-feed-comment.service";
import { FeedCommentActor } from "./types";

const FEED_COMMENT_FLAGS = [
  FeatureFlagKeys.SHELTER_FEED,
  FeatureFlagKeys.SHELTER_FEED_COMMENTS,
] as const;

const toActor = (req: AuthenticatedRequest): FeedCommentActor => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthenticatedException(FEED_COMMENT_MESSAGES.INVALID_SESSION);
  }
  return { userId, isAdmin: normalizeRole(req.user?.role) === UserRole.ADMIN };
};

/**
 * Comentários do feed: sempre com sessão (privacidade das fotos de abrigo). Todo
 * comentário nasce pendente; só o aprovado aparece para todos. A moderação é do admin.
 */
@Controller()
export class FeedPhotoCommentController {
  constructor(
    private readonly createService: CreateFeedCommentService,
    private readonly getService: GetFeedCommentService,
    private readonly updateService: UpdateFeedCommentService,
    private readonly deleteService: DeleteFeedCommentService,
  ) {}

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Get(`${FEED_COMMENT_SECTIONS_ROUTE}/:sectionId/comments`)
  list(
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Query() query: ListFeedCommentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedFeedCommentsResponseDto> {
    return this.getService.list(
      sectionId,
      toActor(req),
      query.page,
      query.limit,
    );
  }

  /** Os comentários do próprio usuário na publicação (pendentes e reprovados, com o motivo). */
  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Get(`${FEED_COMMENT_SECTIONS_ROUTE}/:sectionId/comments/mine`)
  listMine(
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Query() query: ListFeedCommentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedFeedCommentsResponseDto> {
    return this.getService.listMine(
      sectionId,
      toActor(req),
      query.page,
      query.limit,
    );
  }

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Post(`${FEED_COMMENT_SECTIONS_ROUTE}/:sectionId/comments`)
  create(
    @Param("sectionId", new ParseUUIDPipe()) sectionId: string,
    @Body() dto: CreateFeedCommentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FeedCommentResponseDto> {
    return this.createService.create(sectionId, toActor(req), dto);
  }

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard)
  @Delete(`${FEED_COMMENT_ITEMS_ROUTE}/:commentId`)
  @HttpCode(204)
  async remove(
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteService.remove(commentId, toActor(req));
  }

  /** Fila de moderação (admin): paginada, filtro por status e busca. */
  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get(`${FEED_COMMENT_ITEMS_ROUTE}/moderation`)
  moderation(
    @Query() query: ModerationFeedCommentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedModerationFeedCommentsResponseDto> {
    return this.getService.listModeration(query, toActor(req));
  }

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get(`${FEED_COMMENT_ITEMS_ROUTE}/moderation/pending-count`)
  pendingCount(): Promise<FeedCommentPendingCountResponseDto> {
    return this.getService.pendingCount();
  }

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(`${FEED_COMMENT_ITEMS_ROUTE}/:commentId/approve`)
  approve(
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FeedCommentResponseDto> {
    return this.updateService.approve(commentId, toActor(req));
  }

  @FeatureFlag(FEED_COMMENT_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(`${FEED_COMMENT_ITEMS_ROUTE}/:commentId/reject`)
  reject(
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @Body() dto: RejectFeedCommentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FeedCommentResponseDto> {
    return this.updateService.reject(commentId, toActor(req), dto.reason);
  }
}
