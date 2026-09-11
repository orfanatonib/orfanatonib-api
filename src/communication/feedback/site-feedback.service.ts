import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { SiteFeedbackEntity } from "./entity/site-feedback.entity";
import { SiteFeedbackRepository } from "./repository/site-feedback.repository";
import { CreateSiteFeedbackDto } from "./dto/create-site-feedback.dto";
import { UpdateSiteFeedbackDto } from "./dto/update-site-feedback.dto";
import { NotificationService } from "../notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

@Injectable()
export class SiteFeedbackService {
  private readonly logger = new Logger(SiteFeedbackService.name);

  constructor(
    private readonly siteFeedbackRepo: SiteFeedbackRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async create(dto: CreateSiteFeedbackDto): Promise<SiteFeedbackEntity> {
    const feedback = this.siteFeedbackRepo.create(dto);
    const saved = await this.siteFeedbackRepo.save(feedback);

    // Em segundo plano: o visitante não espera o e-mail da coordenação sair.
    void this.notifyAdmins(saved);

    return saved;
  }

  /** Feedback do site não gerava aviso nenhum: ficava só na tabela. */
  private async notifyAdmins(feedback: SiteFeedbackEntity): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();
      if (adminEmails.length === 0) return;

      await this.notificationService.sendFeedbackNotification(
        {
          name: feedback.name,
          email: feedback.email,
          rating: feedback.rating,
          comment: feedback.comment,
        },
        adminEmails,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to notify admins about site feedback: ${reason}`,
      );
    }
  }

  async findAll(): Promise<SiteFeedbackEntity[]> {
    return this.siteFeedbackRepo.findAll();
  }

  async findOne(id: string): Promise<SiteFeedbackEntity> {
    const feedback = await this.siteFeedbackRepo.findOneBy({ id });
    if (!feedback) {
      throw new NotFoundException("Site feedback not found");
    }
    return feedback;
  }

  async update(
    id: string,
    dto: UpdateSiteFeedbackDto,
  ): Promise<SiteFeedbackEntity> {
    const feedback = await this.findOne(id);
    Object.assign(feedback, dto);
    return this.siteFeedbackRepo.save(feedback);
  }

  async remove(id: string): Promise<void> {
    const feedback = await this.findOne(id);
    await this.siteFeedbackRepo.remove(feedback);
  }

  async setReadOnFeedback(id: string): Promise<SiteFeedbackEntity> {
    try {
      const feedback = await this.siteFeedbackRepo.findById(id);

      if (!feedback) {
        throw new NotFoundException("Site feedback not found");
      }

      feedback.read = true;
      return this.siteFeedbackRepo.save(feedback);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        "Error updating site feedback",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Error updating site feedback");
    }
  }
}
