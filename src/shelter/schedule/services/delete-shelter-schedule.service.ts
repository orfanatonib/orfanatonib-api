import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ShelterScheduleRepository } from "../shelter-schedule.repository";
import { DeleteEventService } from "src/content/event/services/delete-event.service";
import { EventRepository } from "src/content/event/event.repository";
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import {
  assertCanAttemptScheduleWrite,
  assertCanManageScheduleIn,
} from "../utils/schedule-access.util";

@Injectable()
export class DeleteShelterScheduleService {
  private readonly logger = new Logger(DeleteShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly eventRepo: EventRepository,
    private readonly deleteEventService: DeleteEventService,
    private readonly getTeamsService: GetTeamsService,
  ) {}

  /** Entrada HTTP: admin, ou líder do abrigo da agenda (404 se não existe). */
  async executeAs(actor: ShelterAccessContext, id: string): Promise<void> {
    assertCanAttemptScheduleWrite(actor);
    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Shelter schedule with ID ${id} not found`);
    }
    await assertCanManageScheduleIn(
      actor,
      schedule.team.shelter.id,
      this.getTeamsService,
    );
    return this.execute(id);
  }

  async execute(id: string): Promise<void> {
    this.logger.log(`Deleting shelter schedule ${id}`);

    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Shelter schedule with ID ${id} not found`);
    }

    // Se apagar um evento falha, a agenda NÃO é removida: sumir com a agenda
    // deixaria eventos órfãos que ninguém mais alcança.
    const events = await this.eventRepo.findByScheduleId(id);
    for (const event of events) {
      await this.deleteEventService.remove(event.id);
    }
    if (events.length > 0) {
      this.logger.log(`Deleted ${events.length} events for schedule ${id}`);
    }

    await this.scheduleRepo.remove(id);
    this.logger.log(`Shelter schedule ${id} deleted successfully`);
  }
}
