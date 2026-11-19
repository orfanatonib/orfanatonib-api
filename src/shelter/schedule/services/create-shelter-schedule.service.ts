import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ShelterScheduleRepository } from "../shelter-schedule.repository";
import { CreateShelterScheduleDto } from "../dto/create-shelter-schedule.dto";
import { ShelterScheduleEntity } from "../entities/shelter-schedule.entity";
import { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import { ShelterScheduleEventService } from "./shelter-schedule-event.service";

import type { ShelterAccessContext } from "src/shelter/shelter/types";
import {
  assertCanAttemptScheduleWrite,
  assertCanManageScheduleIn,
} from "../utils/schedule-access.util";

@Injectable()
export class CreateShelterScheduleService {
  private readonly logger = new Logger(CreateShelterScheduleService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly getTeamsService: GetTeamsService,
    private readonly scheduleEventService: ShelterScheduleEventService,
  ) {}

  /** Entrada HTTP: admin, ou líder do abrigo da equipe informada. */
  async executeAs(
    actor: ShelterAccessContext,
    dto: CreateShelterScheduleDto,
  ): Promise<ShelterScheduleEntity> {
    assertCanAttemptScheduleWrite(actor);
    const team = await this.getTeamsService.findOneEntity(dto.teamId);
    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }
    await assertCanManageScheduleIn(
      actor,
      team.shelter.id,
      this.getTeamsService,
    );
    return this.execute(dto);
  }

  async execute(dto: CreateShelterScheduleDto): Promise<ShelterScheduleEntity> {
    this.logger.log(`Creating shelter schedule for team ${dto.teamId}`);

    const team = await this.getTeamsService.findOneEntity(dto.teamId);
    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    const existingSchedule = await this.scheduleRepo.findByTeamIdAndVisitNumber(
      dto.teamId,
      dto.visitNumber,
    );
    if (existingSchedule) {
      throw new ConflictException(
        `A schedule for this team with visit number ${dto.visitNumber} already exists. Cannot create duplicate visit.`,
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

    await this.scheduleEventService.syncEventsForCreate(schedule, dto, team);

    this.logger.log(`Shelter schedule created with ID ${schedule.id}`);

    const fullSchedule = await this.scheduleRepo.findById(schedule.id);
    if (!fullSchedule) {
      throw new NotFoundException(`Failed to retrieve created schedule`);
    }
    return fullSchedule;
  }
}
