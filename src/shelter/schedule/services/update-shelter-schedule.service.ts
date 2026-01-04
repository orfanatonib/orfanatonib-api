import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ShelterScheduleRepository } from '../shelter-schedule.repository';
import { UpdateShelterScheduleDto } from '../dto/update-shelter-schedule.dto';
import { ShelterScheduleEntity } from '../entities/shelter-schedule.entity';
import { TeamsService } from 'src/shelter/team/services/teams.service';
import { EventRepository } from 'src/content/event/event.repository';
import { DeleteEventService } from 'src/content/event/services/delete-event-service';
import { EventAudience } from 'src/content/event/entities/event.entity';

@Injectable()
export class UpdateShelterScheduleService {
  private readonly logger = new Logger(UpdateShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly teamsService: TeamsService,
    private readonly eventRepo: EventRepository,
    private readonly deleteEventService: DeleteEventService,
  ) {}

  async execute(id: string, dto: UpdateShelterScheduleDto): Promise<ShelterScheduleEntity> {
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

    // Determine the new visit number and team (from dto or keep current)
    const newVisitNumber = dto.visitNumber ?? schedule.visitNumber;
    const newTeamId = dto.teamId ?? schedule.team.id;

    // Validate visit number uniqueness for the team (if visitNumber is being set or changed)
    if (dto.visitNumber !== undefined || dto.teamId !== undefined) {
      const existingSchedule = await this.scheduleRepo.findByTeamIdAndVisitNumber(newTeamId, newVisitNumber);
      // Only throw error if it's a different schedule
      if (existingSchedule && existingSchedule.id !== id) {
        throw new BadRequestException(
          `A schedule for this team with visit number ${newVisitNumber} already exists. Cannot create duplicate visit.`
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

    // Always delete and recreate events based on what's provided
    const newVisitDate = dto.visitDate ?? schedule.visitDate;
    const newMeetingDate = dto.meetingDate ?? schedule.meetingDate;

    await this.scheduleRepo.update(id, updateData);

    // Handle event updates - delete old and recreate based on dates
    await this.deleteExistingEvents(id);

    const team = await this.teamsService.findOneEntity(newTeamId);
    
    if (this.isValidDate(newVisitDate)) {
      await this.createVisitEvent(
        {
          lessonContent: updateData.lessonContent ?? schedule.lessonContent,
        },
        newVisitDate as string,
        team,
        id,
      );
      this.logger.log(`Visit event recreated for schedule ${id}`);
    }

    if (this.isValidDate(newMeetingDate)) {
      await this.createMeetingEvent(
        {
          observation: updateData.observation ?? schedule.observation,
          meetingRoom: updateData.meetingRoom ?? schedule.meetingRoom,
        },
        newMeetingDate as string,
        team,
        id,
      );
      this.logger.log(`Meeting event recreated for schedule ${id}`);
    }

    if (!this.isValidDate(newVisitDate) && !this.isValidDate(newMeetingDate)) {
      this.logger.log(`Skipping event creation - no valid dates provided`);
    }

    const updated = await this.scheduleRepo.findById(id);
    if (!updated) {
      throw new NotFoundException(`Failed to retrieve updated schedule`);
    }

    this.logger.log(`Shelter schedule ${id} updated successfully`);
    return updated;
  }

  private isValidDate(date: string | undefined): boolean {
    if (!date || typeof date !== 'string' || date.trim() === '') {
      return false;
    }
    
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private async deleteExistingEvents(scheduleId: string): Promise<void> {
    try {
      const events = await this.eventRepo.findByScheduleId(scheduleId);
      if (events.length > 0) {
        for (const event of events) {
          await this.deleteEventService.remove(event.id);
        }
        this.logger.log(`Deleted ${events.length} existing events for schedule ${scheduleId}`);
      }
    } catch (error) {
      this.logger.warn(`Could not delete existing events: ${error.message}`);
    }
  }

  private async createVisitEvent(
    data: any,
    visitDate: string,
    team: any,
    scheduleId: string,
  ): Promise<void> {
    const shelter = team.shelter;
    const visitLocation = shelter.address
      ? `${shelter.address.street}, ${shelter.address.number} - ${shelter.address.city}, ${shelter.address.state}`
      : shelter.name;

    const teamInfo = `Equipe ${team.numberTeam} - ${shelter.name}`;
    const visitTitle = `Visita - ${teamInfo}`;

    try {
      await this.eventRepo.create({
        title: visitTitle,
        description: `${data.lessonContent}\n\n${teamInfo}`,
        date: visitDate,
        location: visitLocation,
        audience: EventAudience.TEACHERS,
        shelterSchedule: { id: scheduleId },
      });
    } catch (error) {
      this.logger.error(`Error creating visit event`, error.stack);
      throw error;
    }
  }

  private async createMeetingEvent(
    data: any,
    meetingDate: string,
    team: any,
    scheduleId: string,
  ): Promise<void> {
    const shelter = team.shelter;
    const teamInfo = `Equipe ${team.numberTeam} - ${shelter.name}`;
    const meetingTitle = `Reunião - ${teamInfo}`;

    try {
      await this.eventRepo.create({
        title: meetingTitle,
        description: `${data.observation || 'Reunião de planejamento'}\n\n${teamInfo}`,
        date: meetingDate,
        location: data.meetingRoom || 'NIB - Nova Igreja Batista',
        audience: EventAudience.TEACHERS,
        shelterSchedule: { id: scheduleId },
      });
    } catch (error) {
      this.logger.error(`Error creating meeting event`, error.stack);
      throw error;
    }
  }

  private async createEventsForSchedule(
    scheduleId: string,
    data: any,
    team: any,
  ): Promise<void> {
    const shelter = team.shelter;
    const visitLocation = shelter.address
      ? `${shelter.address.street}, ${shelter.address.number} - ${shelter.address.city}, ${shelter.address.state}`
      : shelter.name;

    const teamInfo = `Equipe ${team.numberTeam} - ${shelter.name}`;
    const visitTitle = `Visita - ${teamInfo}`;
    const meetingTitle = `Reunião - ${teamInfo}`;

    try {
      await this.eventRepo.create({
        title: visitTitle,
        description: `${data.lessonContent}\n\n${teamInfo}`,
        date: data.visitDate,
        location: visitLocation,
        audience: EventAudience.TEACHERS,
      });

      await this.eventRepo.create({
        title: meetingTitle,
        description: `${data.observation || 'Reunião de planejamento'}\n\n${teamInfo}`,
        date: data.meetingDate,
        location: data.meetingRoom || 'NIB - Nova Igreja Batista',
        audience: EventAudience.TEACHERS,
      });
    } catch (error) {
      this.logger.error(`Error creating events for schedule`, error.stack);
      throw error;
    }
  }
}
