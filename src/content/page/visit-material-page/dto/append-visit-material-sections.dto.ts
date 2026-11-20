import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { VisitMaterialMediaInputDto } from "./visit-material-media.dto";
import { VisitMaterialSectionInputDto } from "./visit-material-section.dto";

/**
 * Acrescenta seções (e, se vierem, mídias da própria página, "Geral") a uma página que já existe. Só cria: seção de
 * categoria que a página já tem é recusada, e nada do que já está na página é alterado ou removido.
 */
export class AppendVisitMaterialSectionsDto extends VisitMaterialMediaInputDto {
  @IsArray({ message: 'O campo "sections" deve ser um array.' })
  @ArrayMinSize(1, { message: "Informe ao menos uma seção para acrescentar." })
  @ArrayMaxSize(4, {
    message: "Uma página aceita no máximo 4 seções (uma por categoria).",
  })
  @ValidateNested({ each: true })
  @Type(() => VisitMaterialSectionInputDto)
  sections: VisitMaterialSectionInputDto[];
}
