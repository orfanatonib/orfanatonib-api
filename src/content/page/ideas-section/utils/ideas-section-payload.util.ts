import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { RuleException } from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { UploadedFilesDict } from "../types";

type DtoConstructor<TDto> = new () => TDto;

/**
 * A seção chega num formulário multipart cujo JSON vem num único campo de
 * texto, então o `ValidationPipe` global nunca o vê.
 *
 * Antes cada rota repetia `JSON.parse` + `plainToInstance` + `validate` — e o
 * `JSON.parse` de um campo ausente ou malformado estourava `SyntaxError`, que
 * virava **500 com stack trace no corpo da resposta**.
 */
export const parseIdeasSectionPayload = <TDto extends object>(
  raw: string | Buffer | undefined,
  dtoClass: DtoConstructor<TDto>,
): TDto => {
  if (raw === undefined || raw === null || raw.length === 0) {
    throw new RuleException(IDEAS_SECTION_MESSAGES.PAYLOAD_REQUIRED);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);
  } catch {
    throw new RuleException(IDEAS_SECTION_MESSAGES.INVALID_PAYLOAD);
  }

  const dto = plainToInstance(dtoClass, parsed, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new RuleException(
      IDEAS_SECTION_MESSAGES.INVALID_PAYLOAD,
      errors.map((error) => ({
        field: error.property,
        constraints: error.constraints,
      })),
    );
  }

  return dto;
};

/** Indexa os arquivos enviados pelo nome do campo que o payload referencia. */
export const toFilesDict = (
  files: Express.Multer.File[] = [],
): UploadedFilesDict =>
  Object.fromEntries(files.map((file) => [file.fieldname, file]));
