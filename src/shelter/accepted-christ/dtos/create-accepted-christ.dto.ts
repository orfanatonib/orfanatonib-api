import { IsEnum, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { DecisionType } from '../enums/decision-type.enum';

export class CreateAcceptedChristDto {
  @IsEnum(DecisionType)
  @IsOptional()
  decision?: DecisionType;

  @IsUUID()
  @IsNotEmpty()
  shelteredId: string;

  @IsOptional()
  notes?: string | null;
}
