import { ShelterScheduleEntity } from '../entities/shelter-schedule.entity';

export class ShelterScheduleResponseDto {
  id: string;
  visitNumber: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent: string;
  observation?: string;
  meetingRoom?: string;
  shelter: {
    id: string;
    name: string;
    description?: string;
    address?: {
      street?: string;
      number?: string;
      district?: string;
      city: string;
      state: string;
      postalCode?: string;
      complement?: string;
    };
    team: {
      id: string;
      numberTeam: number;
      description?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ShelterScheduleEntity): ShelterScheduleResponseDto {
    const shelter = entity.team.shelter;
    const team = entity.team;

    return {
      id: entity.id,
      visitNumber: entity.visitNumber,
      visitDate: entity.visitDate,
      meetingDate: entity.meetingDate,
      lessonContent: entity.lessonContent,
      observation: entity.observation,
      meetingRoom: entity.meetingRoom,
      shelter: {
        id: shelter.id,
        name: shelter.name,
        description: shelter.description,
        address: shelter.address ? {
          street: shelter.address.street || undefined,
          number: shelter.address.number || undefined,
          district: shelter.address.district || undefined,
          city: shelter.address.city,
          state: shelter.address.state,
          postalCode: shelter.address.postalCode || undefined,
          complement: shelter.address.complement || undefined,
        } : undefined,
        team: {
          id: team.id,
          numberTeam: team.numberTeam,
          description: team.description,
        },
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
