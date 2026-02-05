import { VisitReportEntity } from '../entities/visit-report.entity';

export class VisitReportResponseDto {
  id: string;
  teamMembersPresent: number;
  shelteredHeardMessage: number;
  caretakersHeardMessage: number;
  shelteredDecisions: number;
  caretakersDecisions: number;
  observation?: string;
  schedule: {
    id: string;
    visitNumber: number;
    visitDate?: string;
    meetingDate?: string;
    lessonContent: string;
    observation?: string;
  };
  team: {
    id: string;
    numberTeam: number;
    description?: string;
    leaders: {
      id: string;
      name: string;
      email: string;
    }[];
  };
  shelter: {
    id: string;
    name: string;
    description?: string;
    address?: {
      street?: string;
      number?: string;
      district?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      complement?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: VisitReportEntity): VisitReportResponseDto {
    const schedule = entity.schedule;
    const team = schedule.team;
    const shelter = team.shelter;
    const address = shelter?.address;
    const leaders = team.leaders || [];

    return {
      id: entity.id,
      teamMembersPresent: entity.teamMembersPresent,
      shelteredHeardMessage: entity.shelteredHeardMessage,
      caretakersHeardMessage: entity.caretakersHeardMessage,
      shelteredDecisions: entity.shelteredDecisions,
      caretakersDecisions: entity.caretakersDecisions,
      observation: entity.observation,
      schedule: {
        id: schedule.id,
        visitNumber: schedule.visitNumber,
        visitDate: schedule.visitDate,
        meetingDate: schedule.meetingDate,
        lessonContent: schedule.lessonContent,
        observation: schedule.observation,
      },
      team: {
        id: team.id,
        numberTeam: team.numberTeam,
        description: team.description,
        leaders: leaders.map((leader) => ({
          id: leader.id,
          name: leader.user?.name || '',
          email: leader.user?.email || '',
        })),
      },
      shelter: {
        id: shelter.id,
        name: shelter.name,
        description: shelter.description,
        address: address
          ? {
              street: address.street || undefined,
              number: address.number || undefined,
              district: address.district || undefined,
              city: address.city || undefined,
              state: address.state || undefined,
              postalCode: address.postalCode || undefined,
              complement: address.complement || undefined,
            }
          : undefined,
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
