import { Injectable, Logger } from "@nestjs/common";
import { EventRepository } from "src/content/event/event.repository";
import { CreateEventService } from "src/content/event/services/create-event.service";
import { UpdateEventService } from "src/content/event/services/update-event.service";
import { DeleteEventService } from "src/content/event/services/delete-event.service";
import {
  EventAudience,
  EventType,
  EventEntity,
} from "src/content/event/entities/event.entity";
import { CreateShelterScheduleDto } from "../dto/create-shelter-schedule.dto";
import { ShelterScheduleEntity } from "../entities/shelter-schedule.entity";

@Injectable()
export class ShelterScheduleEventService {
  private readonly logger = new Logger(ShelterScheduleEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly createEventService: CreateEventService,
    private readonly updateEventService: UpdateEventService,
    private readonly deleteEventService: DeleteEventService,
  ) {}

  isValidDate(date: string | undefined): boolean {
    if (!date || typeof date !== "string" || date.trim() === "") {
      return false;
    }
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  async syncEventsForCreate(
    schedule: ShelterScheduleEntity,
    dto: CreateShelterScheduleDto,
    team: any,
  ): Promise<void> {
    if (this.isValidDate(dto.visitDate)) {
      await this.createVisitEvent(schedule, dto, team);
    }
    if (this.isValidDate(dto.meetingDate)) {
      await this.createMeetingEvent(schedule, dto, team);
    }
  }

  async syncEventsForUpdate(
    id: string,
    newVisitDate: string | undefined,
    newMeetingDate: string | undefined,
    newLessonContent: string | undefined,
    newObservation: string | undefined,
    newMeetingRoom: string | undefined,
    team: any,
  ): Promise<void> {
    const existingEvents = await this.eventRepo.findByScheduleId(id);
    const visitEvent = existingEvents.find(
      (e) => e.eventType === EventType.VISIT,
    );
    const meetingEvent = existingEvents.find(
      (e) => e.eventType === EventType.MEETING,
    );

    await this.handleVisitEvent(
      visitEvent,
      newVisitDate,
      newLessonContent,
      team,
      id,
    );

    await this.handleMeetingEvent(
      meetingEvent,
      newMeetingDate,
      newObservation,
      newMeetingRoom,
      team,
      id,
    );
  }

  private async createVisitEvent(
    schedule: ShelterScheduleEntity,
    dto: CreateShelterScheduleDto,
    team: any,
  ): Promise<void> {
    const eventData = {
      ...this.buildVisitEventData(dto.visitDate!, dto.lessonContent, team),
      eventType: EventType.VISIT,
      shelterSchedule: { id: schedule.id },
    };
    await this.createEventService.create(eventData);
  }

  private async createMeetingEvent(
    schedule: ShelterScheduleEntity,
    dto: CreateShelterScheduleDto,
    team: any,
  ): Promise<void> {
    const eventData = {
      ...this.buildMeetingEventData(
        dto.meetingDate!,
        dto.observation,
        dto.meetingRoom,
        team,
      ),
      eventType: EventType.MEETING,
      shelterSchedule: { id: schedule.id },
    };
    await this.createEventService.create(eventData);
  }

  private async handleVisitEvent(
    existingEvent: EventEntity | undefined,
    newDate: string | undefined,
    lessonContent: string | undefined,
    team: any,
    scheduleId: string,
  ): Promise<void> {
    const hasValidDate = this.isValidDate(newDate);

    if (existingEvent && hasValidDate) {
      const eventData = this.buildVisitEventData(newDate!, lessonContent, team);
      const hasChanges =
        existingEvent.date !== eventData.date ||
        existingEvent.description !== eventData.description ||
        existingEvent.location !== eventData.location ||
        existingEvent.title !== eventData.title;

      if (hasChanges) {
        await this.updateEventService.update(existingEvent.id, eventData);
      }
    } else if (!existingEvent && hasValidDate) {
      const eventData = {
        ...this.buildVisitEventData(newDate!, lessonContent, team),
        eventType: EventType.VISIT,
        shelterSchedule: { id: scheduleId },
      };
      await this.createEventService.create(eventData);
    } else if (existingEvent && !hasValidDate) {
      await this.deleteEventService.remove(existingEvent.id);
    }
  }

  private async handleMeetingEvent(
    existingEvent: EventEntity | undefined,
    newDate: string | undefined,
    observation: string | undefined,
    meetingRoom: string | undefined,
    team: any,
    scheduleId: string,
  ): Promise<void> {
    const hasValidDate = this.isValidDate(newDate);

    if (existingEvent && hasValidDate) {
      const eventData = this.buildMeetingEventData(
        newDate!,
        observation,
        meetingRoom,
        team,
      );
      const hasChanges =
        existingEvent.date !== eventData.date ||
        existingEvent.description !== eventData.description ||
        existingEvent.location !== eventData.location ||
        existingEvent.title !== eventData.title;

      if (hasChanges) {
        await this.updateEventService.update(existingEvent.id, eventData);
      }
    } else if (!existingEvent && hasValidDate) {
      const eventData = {
        ...this.buildMeetingEventData(newDate!, observation, meetingRoom, team),
        eventType: EventType.MEETING,
        shelterSchedule: { id: scheduleId },
      };
      await this.createEventService.create(eventData);
    } else if (existingEvent && !hasValidDate) {
      await this.deleteEventService.remove(existingEvent.id);
    }
  }

  private buildVisitEventData(
    visitDate: string,
    lessonContent: string | undefined,
    team: any,
  ) {
    const shelter = team.shelter;
    const address = shelter?.address;
    const visitLocation = address?.street
      ? `${address.street}, ${address.number || "s/n"} - ${address.city || ""}, ${address.state || ""}`.trim()
      : shelter?.name || "Local a definir";

    const teamInfo = `Equipe ${team.numberTeam} - ${shelter?.name || "Abrigo"}`;
    const visitTitle = `Visita - ${teamInfo}`;

    return {
      title: visitTitle,
      description: `${lessonContent || ""}\n\n${teamInfo}`,
      date: visitDate,
      location: visitLocation,
      audience: EventAudience.MEMBERS,
    };
  }

  private buildMeetingEventData(
    meetingDate: string,
    observation: string | undefined,
    meetingRoom: string | undefined,
    team: any,
  ) {
    const shelter = team?.shelter;
    const teamInfo = `Equipe ${team?.numberTeam ?? ""} - ${shelter?.name || "Abrigo"}`;
    const meetingTitle = `Reunião - ${teamInfo}`;

    return {
      title: meetingTitle,
      description: `${observation || "Reunião de planejamento"}\n\n${teamInfo}`,
      date: meetingDate,
      location: meetingRoom || "NIB - Nova Igreja Batista",
      audience: EventAudience.MEMBERS,
    };
  }
}
