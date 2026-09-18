import { DecisionType } from "../enums/decision-type.enum";
import { AcceptedChristEntity } from "../entities/accepted-christ.entity";

export class AcceptedChristResponseDto {
  id: string;
  decision: DecisionType | null;
  notes?: string | null;
  shelteredId: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: AcceptedChristEntity): AcceptedChristResponseDto {
    return {
      id: entity.id,
      decision: entity.decision,
      notes: entity.notes,
      shelteredId: entity.sheltered?.id ?? entity.shelteredId ?? "",
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: entity.updatedAt ? entity.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
