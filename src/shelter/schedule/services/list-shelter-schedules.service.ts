import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ShelterScheduleRepository } from '../shelter-schedule.repository';
import { ShelterScheduleEntity } from '../entities/shelter-schedule.entity';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';

@Injectable()
export class ListShelterSchedulesService {
  private readonly logger = new Logger(ListShelterSchedulesService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly authCtx: AuthContextService,
  ) {}

  async execute(req: Request): Promise<ShelterScheduleEntity[]> {
    this.logger.log('Listing shelter schedules');

    const payload = await this.authCtx.tryGetPayload(req);
    const role = payload?.role?.toLowerCase();
    const userId = payload?.sub;

    if (role === 'admin') {
      return this.scheduleRepo.findAll();
    }

    if (role === 'leader' && userId) {
      return this.scheduleRepo.findByLeaderId(userId);
    }

    if (role === 'member' && userId) {
      return this.scheduleRepo.findByMemberId(userId);
    }

    return [];
  }
}
