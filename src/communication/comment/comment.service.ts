import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CommentEntity } from "./entity/comment.entity";
import { CommentRepository } from "./repository/comment.repository";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { NotificationService } from "../notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly commentRepo: CommentRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async create(dto: CreateCommentDto): Promise<CommentEntity> {
    const comment = this.commentRepo.create(dto);
    const saved = await this.commentRepo.save(comment);

    // Em segundo plano: quem comentou não espera o aviso da coordenação.
    void this.notifyAdmins(saved);

    return saved;
  }

  /** O comentário nasce como não publicado e precisa de revisão. */
  private async notifyAdmins(comment: CommentEntity): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();
      if (adminEmails.length === 0) return;

      await this.notificationService.sendCommentNotification(
        {
          authorName: comment.name,
          clubinho: comment.shelter,
          neighborhood: comment.neighborhood,
          comment: comment.comment,
        },
        adminEmails,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify admins about comment: ${reason}`);
    }
  }

  async findAllPublished(): Promise<CommentEntity[]> {
    return this.commentRepo.findAllPublished();
  }

  async findAll(): Promise<CommentEntity[]> {
    return this.commentRepo.findAll();
  }

  async findOne(id: string): Promise<CommentEntity> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    return comment;
  }

  async update(id: string, dto: UpdateCommentDto): Promise<CommentEntity> {
    const comment = await this.findOne(id);
    Object.assign(comment, dto);
    return this.commentRepo.save(comment);
  }

  async remove(id: string): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentRepo.remove(comment);
  }
}
