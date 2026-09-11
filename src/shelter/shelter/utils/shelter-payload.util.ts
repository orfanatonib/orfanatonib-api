import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { RuleException } from "src/common/exceptions";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import {
  SHELTER_MEDIA_PAYLOAD_FIELD,
  SHELTER_MESSAGES,
  SHELTER_PAYLOAD_FIELD,
} from "../constants";
import { UploadedFilesDict } from "../types";

type DtoConstructor<TDto> = new () => TDto;

/** Corpo multipart: o JSON pode vir no campo dedicado ou direto no body. */
export interface ShelterRawBody {
  [SHELTER_PAYLOAD_FIELD]?: string | Record<string, unknown>;
  [key: string]: unknown;
}

export interface ShelterMediaRawBody {
  [SHELTER_MEDIA_PAYLOAD_FIELD]?: string | Record<string, unknown>;
  title?: string;
  description?: string;
  uploadType?: UploadType;
  url?: string;
  isLocalFile?: boolean;
  [key: string]: unknown;
}

/** Payload de mídia aceito no PATCH de imagem. */
export interface ShelterMediaInput {
  title?: string;
  description?: string;
  uploadType?: UploadType;
  url?: string;
  isLocalFile?: boolean;
  fieldKey?: string;
}

const parseJson = (raw: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object")
      return parsed as Record<string, unknown>;
  } catch {
    // cai no erro abaixo
  }
  throw new RuleException(SHELTER_MESSAGES.INVALID_PAYLOAD);
};

const validateOrFail = <TDto extends object>(dto: TDto): TDto => {
  const errors = validateSync(dto);
  if (errors.length > 0) {
    throw new RuleException(
      SHELTER_MESSAGES.INVALID_PAYLOAD,
      errors.map((error) => ({
        field: error.property,
        constraints: error.constraints,
      })),
    );
  }
  return dto;
};

/**
 * O abrigo chega como multipart com o JSON num campo de texto, que o
 * `ValidationPipe` global não enxerga — por isso o parse e a validação
 * acontecem aqui, no transporte, antes de chamar o caso de uso.
 */
export const parseShelterPayload = <TDto extends object>(
  body: ShelterRawBody | undefined,
  dtoClass: DtoConstructor<TDto>,
  { requireContent = true }: { requireContent?: boolean } = {},
): TDto => {
  const field = body?.[SHELTER_PAYLOAD_FIELD];

  const source =
    typeof field === "string"
      ? parseJson(field)
      : field && typeof field === "object"
        ? field
        : body && Object.keys(body).length > 0
          ? body
          : undefined;

  if (!source) {
    if (!requireContent) return validateOrFail(plainToInstance(dtoClass, {}));
    throw new RuleException(SHELTER_MESSAGES.PAYLOAD_REQUIRED);
  }

  return validateOrFail(
    plainToInstance(dtoClass, source, { enableImplicitConversion: true }),
  );
};

/** Payload do PATCH de mídia: campo dedicado ou campos soltos no body. */
export const parseShelterMediaPayload = (
  body: ShelterMediaRawBody | undefined,
): ShelterMediaInput => {
  const field = body?.[SHELTER_MEDIA_PAYLOAD_FIELD];

  if (typeof field === "string") return parseJson(field) as ShelterMediaInput;
  if (field && typeof field === "object") return field as ShelterMediaInput;

  if (body?.title || body?.url) {
    return {
      title: body.title,
      description: body.description,
      uploadType: body.uploadType,
      url: body.url,
      isLocalFile: body.isLocalFile,
    };
  }

  throw new RuleException(SHELTER_MESSAGES.MEDIA_PAYLOAD_REQUIRED);
};

export const toFilesDict = (
  files: Express.Multer.File[] = [],
): UploadedFilesDict =>
  Object.fromEntries(files.map((file) => [file.fieldname, file]));
