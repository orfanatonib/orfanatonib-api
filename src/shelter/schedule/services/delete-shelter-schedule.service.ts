import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ShelterScheduleRepository } from '../shelter-schedule.repository';
import { DeleteEventService } from 'src/content/event/services/delete-event-service';
import { EventRepository } from 'src/content/event/event.repository';

@Injectable()
export class DeleteShelterScheduleService {
  private readonly logger = new Logger(DeleteShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly eventRepo: EventRepository,
    private readonly deleteEventService: DeleteEventService,
  ) {}

  async execute(id: string): Promise<void> {
    this.logger.log(`Deleting shelter schedule ${id}`);

    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Shelter schedule with ID ${id} not found`);
    }

    try {
      const events = await this.eventRepo.findByScheduleId(id);
      if (events.length > 0) {
        for (const event of events) {
          await this.deleteEventService.remove(event.id);
        }
        this.logger.log(`Deleted ${events.length} events for schedule ${id}`);
      }
    } catch (error) {
      this.logger.warn(`Could not delete events: ${error.message}`);
    }

    await this.scheduleRepo.remove(id);
    this.logger.log(`Shelter schedule ${id} deleted successfully`);
  }
}
