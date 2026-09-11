import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";

export class UpdateVisitMaterialsPageDto extends VisitMaterialMediaInputDto {
  @IsString({ message: 'O campo "id" da página deve ser uma string.' })
  id: string;

  @IsString({ message: 'O campo "pageTitle" da página deve ser uma string.' })
  pageTitle: string;

  @IsString({
    message: 'O campo "pageSubtitle" da página deve ser uma string.',
  })
  pageSubtitle: string;

  @IsString({
    message: 'O campo "pageDescription" da página deve ser uma string.',
  })
  pageDescription: string;

  @IsBoolean({
    message: 'O campo "currentWeek" da página deve ser uma boolean.',
  })
  currentWeek: boolean;

  @IsOptional()
  @IsEnum(TestamentType, {
    message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.',
  })
  testament?: TestamentType;
}
