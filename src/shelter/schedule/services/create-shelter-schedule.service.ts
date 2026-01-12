import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ShelterScheduleRepository } from '../shelter-schedule.repository';
import { CreateShelterScheduleDto } from '../dto/create-shelter-schedule.dto';
import { ShelterScheduleEntity } from '../entities/shelter-schedule.entity';
import { EventRepository } from 'src/content/event/event.repository';
import { EventAudience } from 'src/content/event/entities/event.entity';
import { TeamsService } from 'src/shelter/team/services/teams.service';

@Injectable()
export class CreateShelterScheduleService {
  private readonly logger = new Logger(CreateShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly eventRepo: EventRepository,
    private readonly teamsService: TeamsService,
  ) {}

  async execute(dto: CreateShelterScheduleDto): Promise<ShelterScheduleEntity> {
    this.logger.log(`Creating shelter schedule for team ${dto.teamId}`);

    const team = await this.teamsService.findOneEntity(dto.teamId);

    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    // Validate visit number uniqueness for the team
    const existingSchedule = await this.scheduleRepo.findByTeamIdAndVisitNumber(dto.teamId, dto.visitNumber);
    if (existingSchedule) {
      throw new BadRequestException(
        `A schedule for this team with visit number ${dto.visitNumber} already exists. Cannot create duplicate visit.`
      );
    }

    const schedule = await this.scheduleRepo.create({
      visitNumber: dto.visitNumber,
      visitDate: dto.visitDate,
      meetingDate: dto.meetingDate,
      lessonContent: dto.lessonContent,
      observation: dto.observation,
      meetingRoom: dto.meetingRoom,
      team: { id: dto.teamId },
    });

    // Create events independently based on what's provided
    if (this.isValidDate(dto.visitDate)) {
      await this.createVisitEvent(schedule, dto, team);
      this.logger.log(`Visit event created for schedule ${schedule.id}`);
    }

    if (this.isValidDate(dto.meetingDate)) {
      await this.createMeetingEvent(schedule, dto, team);
      this.logger.log(`Meeting event created for schedule ${schedule.id}`);
    }

    if (!this.isValidDate(dto.visitDate) && !this.isValidDate(dto.meetingDate)) {
      this.logger.log(`Skipping event creation - no valid dates provided`);
    }

    this.logger.log(`Shelter schedule created with ID ${schedule.id}`);
    
    // Return the schedule with all relationships loaded
    const fullSchedule = await this.scheduleRepo.findById(schedule.id);
    if (!fullSchedule) {
      throw new NotFoundException(`Failed to retrieve created schedule`);
    }
    return fullSchedule;
  }

  private isValidDate(date: string | undefined): boolean {
    if (!date || typeof date !== 'string' || date.trim() === '') {
      return false;
    }
    
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private async createVisitEvent(
    schedule: ShelterScheduleEntity,
    dto: CreateShelterScheduleDto,
    team: any,
  ): Promise<void> {
    const shelter = team.shelter;
    const address = shelter?.address;
    const visitLocation = address?.street
      ? `${address.street}, ${address.number || 's/n'} - ${address.city || ''}, ${address.state || ''}`.trim()
      : shelter?.name || 'Local a definir';

    const teamInfo = `Equipe ${team.numberTeam} - ${shelter?.name || 'Abrigo'}`;
    const visitTitle = `Visita - ${teamInfo}`;

    try {
      await this.eventRepo.create({
        title: visitTitle,
        description: `${dto.lessonContent}\n\n${teamInfo}`,
        date: dto.visitDate!,
        location: visitLocation,
        audience: EventAudience.MEMBERS,
        shelterSchedule: { id: schedule.id },
      });
    } catch (error) {
      this.logger.error(`Error creating visit event for schedule`, error.stack);
      throw error;
    }
  }

  private async createMeetingEvent(
    schedule: ShelterScheduleEntity,
    dto: CreateShelterScheduleDto,
    team: any,
  ): Promise<void> {
    const shelter = team.shelter;
    const teamInfo = `Equipe ${team.numberTeam} - ${shelter.name}`;
    const meetingTitle = `Reunião - ${teamInfo}`;

    try {
      await this.eventRepo.create({
        title: meetingTitle,
        description: `${dto.observation || 'Reunião de planejamento'}\n\n${teamInfo}`,
        date: dto.meetingDate!,
        location: dto.meetingRoom || 'NIB - Nova Igreja Batista',
        audience: EventAudience.MEMBERS,
        shelterSchedule: { id: schedule.id },
      });
    } catch (error) {
      this.logger.error(`Error creating meeting event for schedule`, error.stack);
      throw error;
    }
  }
}
