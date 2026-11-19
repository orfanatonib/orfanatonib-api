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
  UseGuards,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { CreateCommentService } from "./services/create-comment.service";
import { DeleteCommentService } from "./services/delete-comment.service";
import { GetCommentService } from "./services/get-comment.service";
import { UpdateCommentService } from "./services/update-comment.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CommentResponseDto } from "./dto/comment-response.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("comments")
export class CommentController {
  private readonly logger = new Logger(CommentController.name);

  constructor(
    private readonly createCommentService: CreateCommentService,
    private readonly getCommentService: GetCommentService,
    private readonly updateCommentService: UpdateCommentService,
    private readonly deleteCommentService: DeleteCommentService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.COMMENT_SUBMISSION)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateCommentDto): Promise<CommentResponseDto> {
    this.logger.log("Creating new comment");
    const created = await this.createCommentService.execute(dto);
    this.logger.log(`Comment created successfully: ${created.id}`);
    return plainToInstance(CommentResponseDto, created);
  }

  @FeatureFlag(FeatureFlagKeys.COMMENT_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findAll(): Promise<CommentResponseDto[]> {
    const comments = await this.getCommentService.findAll();
    return plainToInstance(CommentResponseDto, comments);
  }

  @FeatureFlag(FeatureFlagKeys.HOME_COMMENTS)
  @UseGuards(FeatureFlagGuard)
  @Get("/published")
  async findAllPublished(): Promise<CommentResponseDto[]> {
    const comments = await this.getCommentService.findAllPublished();
    return plainToInstance(CommentResponseDto, comments);
  }

  @FeatureFlag(FeatureFlagKeys.COMMENT_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findOne(@Param("id") id: string): Promise<CommentResponseDto> {
    const comment = await this.getCommentService.findOne(id);
    return plainToInstance(CommentResponseDto, comment);
  }

  @FeatureFlag(FeatureFlagKeys.COMMENT_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    this.logger.log(`Updating comment: ${id}`);
    const updated = await this.updateCommentService.execute(id, dto);
    this.logger.log(`Comment updated successfully: ${id}`);
    return plainToInstance(CommentResponseDto, updated);
  }

  @FeatureFlag(FeatureFlagKeys.COMMENT_MODERATION)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting comment: ${id}`);
    await this.deleteCommentService.execute(id);
    this.logger.log(`Comment deleted successfully: ${id}`);
  }
}
