import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { SiteFeedbackEntity } from './entity/site-feedback.entity';
import { SiteFeedbackRepository } from './repository/site-feedback.repository';
import { CreateSiteFeedbackDto } from './dto/create-site-feedback.dto';
import { UpdateSiteFeedbackDto } from './dto/update-site-feedback.dto';

@Injectable()
export class SiteFeedbackService {
  private readonly logger = new Logger(SiteFeedbackService.name);

  constructor(private readonly siteFeedbackRepo: SiteFeedbackRepository) { }

  async create(dto: CreateSiteFeedbackDto): Promise<SiteFeedbackEntity> {
    const feedback = this.siteFeedbackRepo.create(dto);
    return this.siteFeedbackRepo.save(feedback);
  }

  async findAll(): Promise<SiteFeedbackEntity[]> {
    return this.siteFeedbackRepo.findAll();
  }

  async findOne(id: string): Promise<SiteFeedbackEntity> {
    const feedback = await this.siteFeedbackRepo.findOneBy({ id });
    if (!feedback) {
      throw new NotFoundException('Site feedback not found');
    }
    return feedback;
  }

  async update(id: string, dto: UpdateSiteFeedbackDto): Promise<SiteFeedbackEntity> {
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
        throw new NotFoundException('Site feedback not found');
      }

      feedback.read = true;
      return this.siteFeedbackRepo.save(feedback);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating site feedback', error.stack);
      throw new InternalServerErrorException('Error updating site feedback');
    }
  }
}
