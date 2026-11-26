const MB = 1024 * 1024;

/** Fotos por publicação (a mesma cota que o envio de fotos do abrigo já tinha). */
export const SHELTER_POST_MAX_PHOTOS = 10;

/** Vídeos por publicação. */
export const SHELTER_POST_MAX_VIDEOS = 1;

export const SHELTER_POST_MAX_IMAGE_BYTES = 10 * MB;

/** Abaixo do teto de 200 MB da política de mídia: a requisição inteira passa pela memória da API. */
export const SHELTER_POST_MAX_VIDEO_BYTES = 100 * MB;

/** Formatos aceitos: MIME => extensões permitidas no nome do arquivo. */
export const SHELTER_POST_IMAGE_FORMATS: Readonly<
  Record<string, readonly string[]>
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

export const SHELTER_POST_VIDEO_FORMATS: Readonly<
  Record<string, readonly string[]>
> = {
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
};

/** Limites do multer: o arquivo maior é o vídeo; o total é fotos + vídeo. */
export const IMAGE_SECTION_UPLOAD_LIMITS = {
  fileSize: SHELTER_POST_MAX_VIDEO_BYTES,
  files: SHELTER_POST_MAX_PHOTOS + SHELTER_POST_MAX_VIDEOS,
} as const;

/** Rótulos de caixa (ISO BMFF) que um MP4/MOV pode ter logo após o tamanho. */
export const ISO_BMFF_BOX_TYPES = [
  "ftyp",
  "moov",
  "mdat",
  "wide",
  "free",
  "skip",
] as const;

/** Cabeçalho EBML de todo arquivo WebM/Matroska. */
export const EBML_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3] as const;

export const SHELTER_POST_MESSAGES = {
  EMPTY: "Adicione fotos ou um vídeo para compartilhar.",
  COMPOSITION: `Envie até ${SHELTER_POST_MAX_PHOTOS} fotos e um único vídeo por publicação.`,
  TOO_MANY_VIDEOS: "Envie apenas um vídeo por publicação.",
  TOO_MANY_PHOTOS: `Envie no máximo ${SHELTER_POST_MAX_PHOTOS} fotos por publicação.`,
  PHOTO_INVALID: "Envie fotos JPG, PNG, WebP ou GIF de até 10 MB cada.",
  VIDEO_INVALID: "Envie um vídeo MP4, WebM ou MOV de até 100 MB.",
  FILE_MISSING: "Selecione o arquivo para enviar.",
  FILE_UNLINKED: "Há arquivos sem vínculo com a publicação.",
  FILE_REPEATED: "O mesmo arquivo foi associado a mais de uma mídia.",
} as const;

/** Motivo da reprovação: obrigatório, com teto (cabe no e-mail e na tela do autor). */
export const REJECTION_REASON_MAX_LENGTH = 500;

export const IMAGE_SECTION_REVIEW_MESSAGES = {
  REASON_REQUIRED: "Informe o motivo da reprovação.",
  ALREADY_APPROVED: "Esta publicação já foi aprovada e não pode ser reprovada.",
  NOT_FOUND: "Publicação não encontrada.",
} as const;
