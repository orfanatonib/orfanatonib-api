import { Injectable } from "@nestjs/common";

import {
  compiledSlot,
  VERSE_REFERENCE_SLOT,
} from "../ai/generation/visual-art.constants";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { CHILD_GAME_AGE_GROUPS } from "../ai/generation/audience-profiles.constants";
import { ResourceNotFoundException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import { ContentAssetRepository } from "../repositories/content-asset.repository";

/**
 * Itens do plano que viram imagem: as pranchas/cenas dos visuais da lição, ou os cartões do versículo (um por trecho,
 * mais o cartão da referência).
 */
const asLabel = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

export function plannedImageSlots(
  stageType: ContentStageType,
  content: Record<string, unknown>,
): Array<{ slot: string; title: string }> {
  const list = (value: unknown): Array<Record<string, unknown>> =>
    Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  if (
    stageType === ContentStageType.VERSE_FIXATION ||
    stageType === ContentStageType.STANDARD_GAME
  ) {
    if (typeof content.name !== "string" || !content.name.trim()) return [];
    // Brincadeira das crianças: uma imagem por faixa etária (3 a 8 e 9 a 11 anos).
    const extra =
      stageType === ContentStageType.STANDARD_GAME
        ? list(content.extraGames)
        : [];
    const grouped = extra.length > 0;
    return [content, ...extra].flatMap((game, index) =>
      typeof game.name === "string" && game.name.trim()
        ? [
            {
              slot: compiledSlot(index),
              title: grouped
                ? `${game.name} (${CHILD_GAME_AGE_GROUPS[index]?.range ?? ""})`
                : game.name,
            },
          ]
        : [],
    );
  }
  if (stageType === ContentStageType.VERSE_VISUALS) {
    const reference = (content.referenceCard ?? {}) as Record<string, unknown>;
    return [
      ...list(content.cards).map((card) => ({
        slot: asLabel(card.id),
        title: asLabel(card.text),
      })),
      ...(typeof reference.text === "string" && reference.text.trim()
        ? [{ slot: VERSE_REFERENCE_SLOT, title: reference.text }]
        : []),
    ];
  }
  return list(content.items).map((item) => ({
    slot: asLabel(item.id),
    title: asLabel(item.title),
  }));
}

/** Validade da URL assinada de cada imagem (o editor e a galeria pedem outra ao reabrir). */
export const STAGE_IMAGE_URL_TTL_SECONDS = 60 * 60;

export interface StageImageItem {
  readonly slot: string;
  readonly title: string;
  readonly assetId: string | null;
  /** URL assinada de leitura; `null` quando a imagem ainda não foi gerada (ou falhou). */
  readonly url: string | null;
  readonly updatedAt: Date | null;
}

export interface StageImagesResponse {
  readonly versionId: string | null;
  readonly items: readonly StageImageItem[];
}

/** Imagens da versão atual da etapa, uma por item do plano, com URL assinada de leitura. */
@Injectable()
export class GetStageImagesService {
  constructor(
    private readonly packages: ContentPackagesRepository,
    private readonly assets: ContentAssetRepository,
    private readonly s3: AwsS3Service,
  ) {}

  async execute(
    packageId: string,
    stageId: string,
  ): Promise<StageImagesResponse> {
    const contentPackage = await this.packages.findByIdWithGraph(packageId);
    const stage = contentPackage?.tracks
      ?.flatMap((track) => track.stages ?? [])
      .find((item) => item.id === stageId);
    if (!stage)
      throw new ResourceNotFoundException("Etapa do material não encontrada");
    const version = stage.currentVersion;
    if (!version) return { versionId: null, items: [] };
    const planned = plannedImageSlots(
      stage.stageType,
      version.structuredContent ?? {},
    );
    const stored = await this.assets.listForVersion(version.id);
    const bySlot = new Map(stored.map((asset) => [asset.slot, asset]));
    const items: StageImageItem[] = [];
    for (const item of planned) {
      const asset = bySlot.get(item.slot);
      items.push({
        slot: item.slot,
        title: item.title,
        assetId: asset?.id ?? null,
        url: asset
          ? await this.s3.getSignedReadUrl(
              asset.storageKey,
              STAGE_IMAGE_URL_TTL_SECONDS,
            )
          : null,
        updatedAt: asset?.updatedAt ?? null,
      });
    }
    return { versionId: version.id, items };
  }
}
