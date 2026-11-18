import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ShelterScheduleRepository } from "../shelter-schedule.repository";
import { UpdateShelterScheduleDto } from "../dto/update-shelter-schedule.dto";
import { ShelterScheduleEntity } from "../entities/shelter-schedule.entity";
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import { ShelterScheduleEventService } from "./shelter-schedule-event.service";

@Injectable()
export class UpdateShelterScheduleService {
  private readonly logger = new Logger(UpdateShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly getTeamsService: GetTeamsService,
    private readonly scheduleEventService: ShelterScheduleEventService,
  ) {}

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
      const team = await this.getTeamsService.findOneEntity(dto.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }
    }

    const newVisitNumber = dto.visitNumber ?? schedule.visitNumber;
    const newTeamId = dto.teamId ?? schedule.team.id;

    if (dto.visitNumber !== undefined || dto.teamId !== undefined) {
      const existingSchedule =
        await this.scheduleRepo.findByTeamIdAndVisitNumber(
          newTeamId,
          newVisitNumber,
        );
      if (existingSchedule && existingSchedule.id !== id) {
        throw new ConflictException(
          `A schedule for this team with visit number ${newVisitNumber} already exists. Cannot create duplicate visit.`,
        );
      }
    }

    const updateData: Partial<ShelterScheduleEntity> = {};
    if (dto.visitNumber !== undefined) updateData.visitNumber = dto.visitNumber;
    if (dto.visitDate !== undefined) updateData.visitDate = dto.visitDate;
    if (dto.meetingDate !== undefined) updateData.meetingDate = dto.meetingDate;
    if (dto.lessonContent !== undefined)
      updateData.lessonContent = dto.lessonContent;
    if (dto.observation !== undefined) updateData.observation = dto.observation;
    if (dto.meetingRoom !== undefined) updateData.meetingRoom = dto.meetingRoom;
    if (dto.teamId !== undefined) updateData.team = { id: dto.teamId } as any;

    const newVisitDate = dto.visitDate ?? schedule.visitDate;
    const newMeetingDate = dto.meetingDate ?? schedule.meetingDate;
    const newLessonContent = dto.lessonContent ?? schedule.lessonContent;
    const newObservation = dto.observation ?? schedule.observation;
    const newMeetingRoom = dto.meetingRoom ?? schedule.meetingRoom;

    await this.scheduleRepo.update(id, updateData);

    const team = await this.getTeamsService.findOneEntity(newTeamId);

    await this.scheduleEventService.syncEventsForUpdate(
      id,
      newVisitDate,
      newMeetingDate,
      newLessonContent,
      newObservation,
      newMeetingRoom,
      team,
    );

    const updated = await this.scheduleRepo.findById(id);
    if (!updated) {
      throw new NotFoundException(`Failed to retrieve updated schedule`);
    }

    this.logger.log(`Shelter schedule ${id} updated successfully`);
    return updated;
  }
}
