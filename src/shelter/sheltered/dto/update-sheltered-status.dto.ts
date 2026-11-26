import { IsBoolean } from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";

export class UpdateShelteredStatusDto {
  @StrictBoolean()
  @IsBoolean()
  active!: boolean;
}
