import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from "class-validator";

import { TiptapDocumentValidator } from "./tiptap-document.validator";

export class SaveStageContentDto {
  @IsObject()
  structuredContent: Record<string, unknown>;

  /** Documento rico (TipTap) editado à mão; omitido = a versão não tem edição de documento. */
  @IsOptional()
  @IsObject()
  @Validate(TiptapDocumentValidator)
  contentDocument?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateVersion?: string;
}
