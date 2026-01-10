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
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('comments')
export class CommentController {
  private readonly logger = new Logger(CommentController.name);

  constructor(private readonly commentService: CommentService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateCommentDto): Promise<CommentResponseDto> {
    this.logger.log('Creating new comment');
    const created = await this.commentService.create(dto);
    this.logger.log(`Comment created successfully: ${created.id}`);
    return plainToInstance(CommentResponseDto, created);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findAll(): Promise<CommentResponseDto[]> {
    const comments = await this.commentService.findAll();
    return plainToInstance(CommentResponseDto, comments);
  }

  @Get('/published')
  async findAllPublished(): Promise<CommentResponseDto[]> {
    const comments = await this.commentService.findAllPublished();
    return plainToInstance(CommentResponseDto, comments);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async findOne(@Param('id') id: string): Promise<CommentResponseDto> {
    const comment = await this.commentService.findOne(id);
    return plainToInstance(CommentResponseDto, comment);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    this.logger.log(`Updating comment: ${id}`);
    const updated = await this.commentService.update(id, dto);
    this.logger.log(`Comment updated successfully: ${id}`);
    return plainToInstance(CommentResponseDto, updated);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting comment: ${id}`);
    await this.commentService.remove(id);
    this.logger.log(`Comment deleted successfully: ${id}`);
  }
}
