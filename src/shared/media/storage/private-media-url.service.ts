import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import type { MediaItemEntity } from "../media-item/media-item.entity";
import { extractStorageKey, isPrivateStorageKey } from "./media-storage.utils";

export const PRIVATE_URL_DEFAULT_TTL_SECONDS = 300;
export const PRIVATE_URL_MIN_TTL_SECONDS = 60;
export const PRIVATE_URL_MAX_TTL_SECONDS = 900;

/** Validade da URL assinada: `PRIVATE_MEDIA_URL_TTL_SECONDS` limitada a 1–15 min (padrão 5). */
export function resolvePrivateUrlTtl(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0)
    return PRIVATE_URL_DEFAULT_TTL_SECONDS;
  return Math.min(
    PRIVATE_URL_MAX_TTL_SECONDS,
    Math.max(PRIVATE_URL_MIN_TTL_SECONDS, Math.floor(value)),
  );
}

/**
 * Troca o endereço permanente de um objeto PRIVADO por uma URL assinada de curta duração, na hora da leitura.
 * O banco guarda sempre o endereço do objeto; quem recebe a resposta recebe só a URL assinada.
 * Objetos públicos (legado) passam sem mudança.
 */
@Injectable()
export class PrivateMediaUrlService {
  constructor(
    private readonly s3: AwsS3Service,
    private readonly config: ConfigService,
  ) {}

  /** URL a devolver ao cliente para o endereço guardado. */
  async resolve(storedUrl: string): Promise<string> {
    const key = extractStorageKey(storedUrl, this.s3.getBucketName());
    if (!key || !isPrivateStorageKey(key)) return storedUrl;
    const ttl = resolvePrivateUrlTtl(
      this.config.get<string>("PRIVATE_MEDIA_URL_TTL_SECONDS"),
    );
    return this.s3.getSignedReadUrl(decodeURIComponent(key.split("?")[0]), ttl);
  }

  /** Cópia da mídia com a URL já resolvida (a entidade original e o banco não mudam). */
  async withReadableUrl<T extends Pick<MediaItemEntity, "url">>(
    media: T | null | undefined,
  ): Promise<T | null | undefined> {
    if (!media) return media;
    return { ...media, url: await this.resolve(media.url) };
  }
}
