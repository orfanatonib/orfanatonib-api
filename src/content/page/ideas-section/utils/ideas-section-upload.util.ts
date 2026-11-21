import { BadRequestException } from "@nestjs/common";
import { MEDIA_UPLOAD_POLICIES } from "src/shared/media/storage/media-storage.constants";
import { MediaType } from "src/shared/media/media-item/media-item.entity";

import {
  IDEAS_SECTION_ACCEPTED_MEDIA_TYPES,
  IDEAS_SECTION_UPLOAD_LIMITS,
} from "../constants";

const ACCEPTED_MIMES: ReadonlySet<string> = new Set(
  IDEAS_SECTION_ACCEPTED_MEDIA_TYPES.flatMap((type: MediaType) =>
    Object.keys(MEDIA_UPLOAD_POLICIES[type].allowed),
  ),
);

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

/**
 * Recusa na borda o tipo que a ideia não aceita (áudio, executável, HTML…),
 * antes de o arquivo ocupar memória. O armazenamento ainda confere tamanho por
 * tipo e a assinatura do conteúdo.
 */
export function ideasSectionFileFilter(
  _request: unknown,
  file: Pick<Express.Multer.File, "mimetype" | "originalname">,
  callback: FileFilterCallback,
): void {
  if (ACCEPTED_MIMES.has(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(
    new BadRequestException({
      message: `Arquivo "${file.originalname}" recusado (tipo não aceito em ideias).`,
      category: "RULE",
      details: { code: "MEDIA_MIME" },
    }),
    false,
  );
}

export const IDEAS_UPLOAD_OPTIONS = {
  limits: {
    fileSize: IDEAS_SECTION_UPLOAD_LIMITS.MAX_FILE_BYTES,
    files: IDEAS_SECTION_UPLOAD_LIMITS.MAX_FILES,
  },
  fileFilter: ideasSectionFileFilter,
} as const;
