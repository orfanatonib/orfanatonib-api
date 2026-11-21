import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { GetUsersService } from "./get-user.service";
import { UserErrorMessages, UserLogs } from "../constants/user.constants";
import { KeyedQueue } from "../utils/keyed-queue";

const USER_MEDIA_TARGET = "UserEntity";
const USER_MEDIA_ENTITY = "User";

export interface UserImageBody {
  imageData?: string | UserImageMediaDto;
  title?: string;
  description?: string;
  uploadType?: UploadType | string;
  url?: string;
  isLocalFile?: boolean;
  fieldKey?: string;
}

interface UserImageMediaDto {
  title?: string;
  description?: string;
  uploadType?: UploadType | string;
  url?: string;
  isLocalFile?: boolean;
  fieldKey?: string;
}

@Injectable()
export class UpdateUserImageService {
  private readonly logger = new Logger(UpdateUserImageService.name);

  private readonly imageQueue = new KeyedQueue();

  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  mapFiles(files: Express.Multer.File[]): Record<string, Express.Multer.File> {
    const filesDict: Record<string, Express.Multer.File> = {};
    files.forEach((file) => {
      filesDict[file.fieldname] = file;
    });
    return filesDict;
  }

  private validateImageFile(file: Express.Multer.File): void {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      throw new BadRequestException(
        `Tipo de arquivo inválido. Apenas imagens são permitidas. Tipo recebido: ${file.mimetype || "desconhecido"}`,
      );
    }
  }

  private parseMediaDto(body: UserImageBody): UserImageMediaDto {
    if (body.imageData) {
      return typeof body.imageData === "string"
        ? (JSON.parse(body.imageData) as UserImageMediaDto)
        : body.imageData;
    }
    if (body.title || body.url) {
      return {
        title: body.title,
        description: body.description,
        uploadType: body.uploadType,
        url: body.url,
        isLocalFile: body.isLocalFile,
        fieldKey: body.fieldKey,
      };
    }
    throw new BadRequestException(UserErrorMessages.IMAGE_DATA_REQUIRED);
  }

  private resolveUploadType(
    dto: UserImageMediaDto,
    hasFile: boolean,
  ): UploadType {
    if (dto.uploadType) {
      return String(dto.uploadType).toLowerCase() === "upload"
        ? UploadType.UPLOAD
        : UploadType.LINK;
    }
    return hasFile ? UploadType.UPLOAD : UploadType.LINK;
  }

  private pickFile(
    dto: UserImageMediaDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Express.Multer.File {
    const fieldKey = dto.fieldKey || "file";
    const file = filesDict[fieldKey];
    if (!file) {
      throw new BadRequestException(
        `Arquivo não encontrado para upload. FieldKey: ${fieldKey}, Arquivos disponíveis: ${Object.keys(filesDict).join(", ")}`,
      );
    }
    this.validateImageFile(file);
    return file;
  }

  /**
   * Ordem segura para o S3: envia o novo → grava no banco → só então apaga o
   * antigo. Se o envio ou a gravação falham, o antigo continua referenciado e
   * o novo é descartado (nunca fica objeto órfão nem referência quebrada).
   */
  updateUserImage(
    userId: string,
    body: UserImageBody,
    files: Express.Multer.File[],
  ) {
    // Uma troca por usuário de cada vez: duas simultâneas deixariam um objeto órfão no bucket.
    return this.imageQueue.run(userId, () =>
      this.applyUserImage(userId, body, files),
    );
  }

  private async applyUserImage(
    userId: string,
    body: UserImageBody,
    files: Express.Multer.File[],
  ) {
    await this.getUsersService.findOne(userId);

    const mediaDto = this.parseMediaDto(body);
    const filesDict = this.mapFiles(files);
    const hasFile = files.length > 0;
    const uploadType = this.resolveUploadType(mediaDto, hasFile);

    const existingMedia = await this.mediaItemProcessor.findMediaItemByTarget(
      userId,
      USER_MEDIA_TARGET,
    );

    const media = this.mediaItemProcessor.buildBaseMediaItem(
      {
        ...mediaDto,
        mediaType: MediaType.IMAGE,
        uploadType,
        ...(existingMedia
          ? {}
          : {
              title: mediaDto.title || "Foto do Usuário",
              description:
                mediaDto.description || "Imagem de perfil do usuário",
            }),
      },
      userId,
      USER_MEDIA_TARGET,
    );

    if (!hasFile && !mediaDto.url) {
      throw new BadRequestException(UserErrorMessages.URL_OR_FILE_REQUIRED);
    }

    const batch = this.mediaStorage.newBatch();
    try {
      if (hasFile) {
        const file = this.pickFile(mediaDto, filesDict);
        await this.mediaStorage.uploadAll(
          [
            {
              file,
              mediaType: MediaType.IMAGE,
              entity: USER_MEDIA_ENTITY,
              ownerId: userId,
            },
          ],
          batch,
        );
        const [uploaded] = batch.objects;
        media.uploadType = UploadType.UPLOAD;
        media.url = uploaded.url;
        media.storageKey = uploaded.key;
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
      } else {
        media.uploadType = UploadType.LINK;
        media.url = mediaDto.url ?? "";
        media.isLocalFile = false;
      }

      if (existingMedia) {
        await this.mediaItemProcessor.upsertMediaItem(existingMedia.id, media);
      } else {
        await this.mediaItemProcessor.saveMediaItem(media);
      }
    } catch (error) {
      await batch.discard();
      throw error;
    }
    batch.commit();

    await this.removePrevious(existingMedia);

    this.logger.log(UserLogs.IMAGE_UPDATED(userId));
    return this.getUsersService.findOne(userId);
  }

  private async removePrevious(
    existing: MediaItemEntity | null,
  ): Promise<void> {
    if (existing?.isLocalFile && existing.url) {
      await this.mediaStorage.deleteAfterCommit([existing.url]);
    }
  }
}
