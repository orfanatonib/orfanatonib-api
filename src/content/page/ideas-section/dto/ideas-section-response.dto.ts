import {
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

/**
 * Respostas do módulo. Só tipos: quem monta é o mapper, e o que entra está nos
 * DTOs de criação e atualização.
 */

/** Autor da seção, como a tela o exibe. */
export class IdeasSectionUserDto {
  name!: string;
  email!: string;
  phone?: string;
}

export class IdeasSectionMediaDto {
  id!: string;
  title!: string;
  description!: string;
  uploadType!: UploadType;
  mediaType!: MediaType;
  isLocalFile!: boolean;
  url!: string;
  platformType?: PlatformType;
  originalName?: string;
  size?: number;
}

export class IdeasSectionResponseDto {
  id!: string;
  title!: string;
  description!: string;
  public!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  medias!: IdeasSectionMediaDto[];
  user?: IdeasSectionUserDto;
}
