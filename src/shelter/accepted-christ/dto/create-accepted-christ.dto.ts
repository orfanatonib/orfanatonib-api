import {
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { DecisionType } from "../enums/decision-type.enum";

export class CreateAcceptedChristDto {
  @IsEnum(DecisionType)
  @IsOptional()
  decision?: DecisionType;

  @IsUUID()
  @IsNotEmpty()
  shelteredId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
