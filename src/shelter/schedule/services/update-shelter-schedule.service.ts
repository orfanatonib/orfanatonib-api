import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ShelterScheduleRepository } from '../shelter-schedule.repository';
import { UpdateShelterScheduleDto } from '../dto/update-shelter-schedule.dto';
import { ShelterScheduleEntity } from '../entities/shelter-schedule.entity';
import { TeamsService } from 'src/shelter/team/services/teams.service';
import { EventRepository } from 'src/content/event/event.repository';
import { CreateEventService } from 'src/content/event/services/create-event-service';
import { UpdateEventService } from 'src/content/event/services/update-event-service';
import { DeleteEventService } from 'src/content/event/services/delete-event-service';
import { EventAudience, EventType, EventEntity } from 'src/content/event/entities/event.entity';

@Injectable()
export class UpdateShelterScheduleService {
  private readonly logger = new Logger(UpdateShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly teamsService: TeamsService,
    private readonly eventRepo: EventRepository,
    private readonly createEventService: CreateEventService,
    private readonly updateEventService: UpdateEventService,
    private readonly deleteEventService: DeleteEventService,
  ) { }

  async execute(
    id: string,
    dto: UpdateShelterScheduleDto,
  ): Promise<ShelterScheduleEntity> {
    this.logger.log(`Updating shelter schedule ${id}`);

    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Shelter schedule with ID ${id} not found`);
    }

    if (dto.teamId) {
      const team = await this.teamsService.findOneEntity(dto.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }
    }

    const newVisitNumber = dto.visitNumber ?? schedule.visitNumber;
    const newTeamId = dto.teamId ?? schedule.team.id;

    if (dto.visitNumber !== undefined || dto.teamId !== undefined) {
      const existingSchedule = await this.scheduleRepo.findByTeamIdAndVisitNumber(
        newTeamId,
        newVisitNumber,
      );
      if (existingSchedule && existingSchedule.id !== id) {
        throw new ConflictException(
          `A schedule for this team with visit number ${newVisitNumber} already exists. Cannot create duplicate visit.`,
        );
      }
    }

    const updateData: any = {};
    if (dto.visitNumber !== undefined) updateData.visitNumber = dto.visitNumber;
    if (dto.visitDate !== undefined) updateData.visitDate = dto.visitDate;
    if (dto.meetingDate !== undefined) updateData.meetingDate = dto.meetingDate;
    if (dto.lessonContent !== undefined) updateData.lessonContent = dto.lessonContent;
    if (dto.observation !== undefined) updateData.observation = dto.observation;
    if (dto.meetingRoom !== undefined) updateData.meetingRoom = dto.meetingRoom;
    if (dto.teamId !== undefined) updateData.team = { id: dto.teamId };

    const newVisitDate = dto.visitDate ?? schedule.visitDate;
    const newMeetingDate = dto.meetingDate ?? schedule.meetingDate;
    const newLessonContent = dto.lessonContent ?? schedule.lessonContent;
    const newObservation = dto.observation ?? schedule.observation;
    const newMeetingRoom = dto.meetingRoom ?? schedule.meetingRoom;

    await this.scheduleRepo.update(id, updateData);

    const team = await this.teamsService.findOneEntity(newTeamId);

    const existingEvents = await this.eventRepo.findByScheduleId(id);
    const visitEvent = existingEvents.find((e) => e.eventType === EventType.VISIT);
    const meetingEvent = existingEvents.find((e) => e.eventType === EventType.MEETING);

    await this.handleVisitEvent(visitEvent, newVisitDate, newLessonContent, team, id);

    await this.handleMeetingEvent(
      meetingEvent,
      newMeetingDate,
      newObservation,
      newMeetingRoom,
      team,
      id,
    );

    const updated = await this.scheduleRepo.findById(id);
    if (!updated) {
      throw new NotFoundException(`Failed to retrieve updated schedule`);
    }

    this.logger.log(`Shelter schedule ${id} updated successfully`);
    return updated;
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
        this.logger.log(`Visit event ${existingEvent.id} updated for schedule ${scheduleId}`);
      } else {
        this.logger.log(`No changes detected for visit event ${existingEvent.id}, skipping update`);
      }
    } else if (!existingEvent && hasValidDate) {
      const eventData = {
        ...this.buildVisitEventData(newDate!, lessonContent, team),
        eventType: EventType.VISIT,
        shelterSchedule: { id: scheduleId },
      };
      await this.createEventService.create(eventData);
      this.logger.log(`Visit event created for schedule ${scheduleId}`);
    } else if (existingEvent && !hasValidDate) {
      await this.deleteEventService.remove(existingEvent.id);
      this.logger.log(`Visit event ${existingEvent.id} deleted for schedule ${scheduleId}`);
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
      const eventData = this.buildMeetingEventData(newDate!, observation, meetingRoom, team);

      const hasChanges =
        existingEvent.date !== eventData.date ||
        existingEvent.description !== eventData.description ||
        existingEvent.location !== eventData.location ||
        existingEvent.title !== eventData.title;

      if (hasChanges) {
        await this.updateEventService.update(existingEvent.id, eventData);
        this.logger.log(`Meeting event ${existingEvent.id} updated for schedule ${scheduleId}`);
      } else {
        this.logger.log(`No changes detected for meeting event ${existingEvent.id}, skipping update`);
      }
    } else if (!existingEvent && hasValidDate) {
      const eventData = {
        ...this.buildMeetingEventData(newDate!, observation, meetingRoom, team),
        eventType: EventType.MEETING,
        shelterSchedule: { id: scheduleId },
      };
      await this.createEventService.create(eventData);
      this.logger.log(`Meeting event created for schedule ${scheduleId}`);
    } else if (existingEvent && !hasValidDate) {
      await this.deleteEventService.remove(existingEvent.id);
      this.logger.log(`Meeting event ${existingEvent.id} deleted for schedule ${scheduleId}`);
    }
  }

  private buildVisitEventData(
    visitDate: string,
    lessonContent: string | undefined,
    team: any,
  ): any {
    const shelter = team.shelter;
    const address = shelter?.address;
    const visitLocation = address?.street
      ? `${address.street}, ${address.number || 's/n'} - ${address.city || ''}, ${address.state || ''}`.trim()
      : shelter?.name || 'Local a definir';

    const teamInfo = `Equipe ${team.numberTeam} - ${shelter?.name || 'Abrigo'}`;
    const visitTitle = `Visita - ${teamInfo}`;

    return {
      title: visitTitle,
      description: `${lessonContent || ''}\n\n${teamInfo}`,
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
  ): any {
    const shelter = team.shelter;
    const teamInfo = `Equipe ${team.numberTeam} - ${shelter?.name || 'Abrigo'}`;
    const meetingTitle = `Reunião - ${teamInfo}`;

    return {
      title: meetingTitle,
      description: `${observation || 'Reunião de planejamento'}\n\n${teamInfo}`,
      date: meetingDate,
      location: meetingRoom || 'NIB - Nova Igreja Batista',
      audience: EventAudience.MEMBERS,
    };
  }

  private isValidDate(date: string | undefined): boolean {
    if (!date || typeof date !== 'string' || date.trim() === '') {
      return false;
    }

    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
}
