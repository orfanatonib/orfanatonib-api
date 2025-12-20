import { IsBoolean } from 'class-validator';

export class UpdateShelteredStatusDto {
  @IsBoolean()
  active!: boolean;
}

