import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { SiteFeedbackEntity } from "../entity/site-feedback.entity";
import { SiteFeedbackRepository } from "../repository/site-feedback.repository";
import { UpdateSiteFeedbackDto } from "../dto/update-site-feedback.dto";
import { GetSiteFeedbackService } from "./get-site-feedback.service";

@Injectable()
export class UpdateSiteFeedbackService {
  private readonly logger = new Logger(UpdateSiteFeedbackService.name);

  constructor(
    private readonly siteFeedbackRepo: SiteFeedbackRepository,
    private readonly getFeedbackService: GetSiteFeedbackService,
  ) {}

  async update(
    id: string,
    dto: UpdateSiteFeedbackDto,
  ): Promise<SiteFeedbackEntity> {
    const feedback = await this.getFeedbackService.findOne(id);
    Object.assign(feedback, dto);
    return this.siteFeedbackRepo.save(feedback);
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
