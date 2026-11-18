const MB = 1024 * 1024;

/**
 * Limites de upload por tipo de handler (Multer). Sem `limits`, um único POST autenticado
 * enviaria arquivos de tamanho e quantidade ilimitados direto para a memória da API.
 * O tipo do arquivo continua validado no armazenamento (`validateUploadedFile`).
 */

/** Fotos de abrigo e imagens avulsas: até 10 arquivos de 10 MB. */
export const IMAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: 10 * MB, files: 10 },
} as const;

/** Galeria de imagens (muitas fotos por página): até 30 arquivos de 10 MB. */
export const IMAGE_GALLERY_UPLOAD_OPTIONS = {
  limits: { fileSize: 10 * MB, files: 30 },
} as const;

/** Página de mídia mista (vídeo, documento, imagem, áudio): até 20 arquivos de 200 MB. */
export const MEDIA_PAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: 200 * MB, files: 20 },
} as const;

/** Um único arquivo de mídia (ex.: vídeo ou documento da meditação): 200 MB. */
export const SINGLE_MEDIA_UPLOAD_OPTIONS = {
  limits: { fileSize: 200 * MB, files: 1 },
} as const;
