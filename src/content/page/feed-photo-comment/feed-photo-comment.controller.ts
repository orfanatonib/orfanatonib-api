import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
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
  FeedCommentResponseDto,
  PaginatedFeedCommentsResponseDto,
} from "./dto/feed-comment-response.dto";
import { ListFeedCommentsQueryDto } from "./dto/list-feed-comments-query.dto";
import { CreateFeedCommentService } from "./services/create-feed-comment.service";
import { DeleteFeedCommentService } from "./services/delete-feed-comment.service";
import { GetFeedCommentService } from "./services/get-feed-comment.service";
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

/** Comentários do feed: sempre com sessão (privacidade das fotos de abrigo). */
@Controller()
export class FeedPhotoCommentController {
  constructor(
    private readonly createService: CreateFeedCommentService,
    private readonly getService: GetFeedCommentService,
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
}
