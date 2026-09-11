import { IsEnum, IsOptional, IsString } from "class-validator";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";

export class CreateVisitMaterialsPageDto extends VisitMaterialMediaInputDto {
  @IsString({ message: 'O campo "pageTitle" deve ser uma string.' })
  pageTitle: string;

  @IsString({ message: 'O campo "pageSubtitle" deve ser uma string.' })
  pageSubtitle: string;

  @IsString({ message: 'O campo "pageDescription" deve ser uma string.' })
  pageDescription: string;

  @IsOptional()
  @IsEnum(TestamentType, {
    message: 'O campo "testament" deve ser OLD_TESTAMENT ou NEW_TESTAMENT.',
  })
  testament?: TestamentType;
}
