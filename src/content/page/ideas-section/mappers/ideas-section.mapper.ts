import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

import { IdeasSectionEntity } from "../entities/ideas-section.entity";
import {
  IdeasSectionMediaDto,
  IdeasSectionResponseDto,
  IdeasSectionUserDto,
} from "../dto/ideas-section-response.dto";

/** "Maria Clara dos Santos" → "Maria Santos". */
export const shortName = (fullName?: string | null): string => {
  if (!fullName) return "";

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export const toMediaDto = (media: MediaItemEntity): IdeasSectionMediaDto => ({
  id: media.id,
  title: media.title,
  description: media.description,
  uploadType: media.uploadType,
  mediaType: media.mediaType,
  isLocalFile: media.isLocalFile,
  url: media.url,
  platformType: media.platformType,
  originalName: media.originalName,
  size: media.size,
});

/**
 * O autor só é exposto quando a relação foi carregada **com os dados**. A
 * criação devolvia `user: { name: "", email: undefined }` porque a seção
 * recém-salva carrega apenas `{ id }` — um autor vazio na tela.
 */
export const toUserDto = (
  section: IdeasSectionEntity,
): IdeasSectionUserDto | undefined => {
  const user = section.user;
  if (!user?.email) return undefined;

  return {
    name: shortName(user.name),
    email: user.email,
    phone: user.phone,
  };
};

export const toIdeasSectionDto = (
  section: IdeasSectionEntity,
  medias: readonly MediaItemEntity[],
): IdeasSectionResponseDto => ({
  id: section.id,
  title: section.title,
  description: section.description,
  public: section.public,
  createdAt: section.createdAt,
  updatedAt: section.updatedAt,
  medias: medias.map(toMediaDto),
  user: toUserDto(section),
});

/** Agrupa as mídias de várias seções pelo alvo, para a listagem. */
export const groupMediasByTarget = (
  medias: readonly MediaItemEntity[],
): Map<string, MediaItemEntity[]> => {
  const grouped = new Map<string, MediaItemEntity[]>();

  for (const media of medias) {
    const current = grouped.get(media.targetId) ?? [];
    current.push(media);
    grouped.set(media.targetId, current);
  }

  return grouped;
};
