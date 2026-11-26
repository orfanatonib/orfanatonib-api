import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { RuleException } from "src/common/exceptions";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { VISIT_MATERIAL_MESSAGES } from "../constants";
import { UploadedFilesDict, VisitMaterialMediaBuckets } from "../types";

type DtoConstructor<TDto> = new () => TDto;

/**
 * The page arrives as a multipart form whose JSON lives in a single text field,
 * so the global `ValidationPipe` never sees it. Parsing and validating it is a
 * transport concern and belongs to the controller, not to a use case.
 */
export const parseVisitMaterialPayload = <TDto extends object>(
  raw: string | undefined,
  dtoClass: DtoConstructor<TDto>,
): TDto => {
  if (!raw) {
    throw new RuleException(VISIT_MATERIAL_MESSAGES.PAYLOAD_REQUIRED);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RuleException(VISIT_MATERIAL_MESSAGES.INVALID_PAYLOAD);
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
      VISIT_MATERIAL_MESSAGES.INVALID_PAYLOAD,
      errors.map((error) => ({
        field: error.property,
        constraints: error.constraints,
      })),
    );
  }

  return dto;
};

/** Indexes the uploaded files by the field name the payload refers to. */
export const toFilesDict = (
  files: Express.Multer.File[] = [],
): UploadedFilesDict =>
  Object.fromEntries(files.map((file) => [file.fieldname, file]));

/** Normalizes the optional media arrays into the four buckets. */
export const toMediaBuckets = (source: {
  videos?: MediaItemDto[];
  documents?: MediaItemDto[];
  images?: MediaItemDto[];
  audios?: MediaItemDto[];
}): VisitMaterialMediaBuckets => ({
  videos: source.videos ?? [],
  documents: source.documents ?? [],
  images: source.images ?? [],
  audios: source.audios ?? [],
});
