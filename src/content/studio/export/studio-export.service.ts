import { createHash } from "crypto";

import { Injectable, UnprocessableEntityException } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import type { ContentPackageEntity } from "../entities/content-package.entity";
import type { ContentStageEntity } from "../entities/content-stage.entity";
import type { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import { PdfLibreOfficeService } from "./pdf-libreoffice.service";
import {
  STAGE_DOCUMENT_TITLES,
  buildStageDocument,
} from "./stage-document.builder";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { plannedImageSlots } from "../services/get-stage-images.service";
import { ContentAssetRepository } from "../repositories/content-asset.repository";
import { imageDimensions } from "../ai/utils/image-processing.util";
import { StudioDocxService, type StudioDocxStage } from "./studio-docx.service";
import type { TiptapDocument } from "./tiptap.types";

export enum StudioExportFormat {
  DOCX = "docx",
  PDF = "pdf",
}

export interface StudioExportFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

/** Teto de cada imagem lida do bucket para a exportação (as geradas ficam bem abaixo). */
const MAX_EXPORT_IMAGE_BYTES = 15 * 1024 * 1024;

const CONTENT_TYPES: Record<StudioExportFormat, string> = {
  [StudioExportFormat.DOCX]:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  [StudioExportFormat.PDF]: "application/pdf",
};

/** Nome de arquivo seguro (sem acento, espaço nem símbolo). */
export function exportFileName(
  parts: readonly string[],
  format: StudioExportFormat,
): string {
  const slug = parts
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "material-para-visita"}.${format}`;
}

const ageRange = (track: ContentTrackEntity): string =>
  track.maximumAge === null
    ? `a partir de ${track.minimumAge} anos`
    : `${track.minimumAge} a ${track.maximumAge} anos`;

/**
 * Exportação do material para visita: etapa, faixa etária ou material completo, em DOCX ou PDF.
 * O documento de cada etapa é o editado à mão (`contentDocument`) ou, se ninguém editou, o montado dos campos.
 */
@Injectable()
export class StudioExportService {
  constructor(
    private readonly packages: ContentPackagesRepository,
    private readonly docx: StudioDocxService,
    private readonly pdf: PdfLibreOfficeService,
    private readonly assets: ContentAssetRepository,
    private readonly s3: AwsS3Service,
  ) {}

  async exportStage(
    packageId: string,
    stageId: string,
    format: StudioExportFormat,
  ): Promise<StudioExportFile> {
    const contentPackage = await this.load(packageId);
    const track = (contentPackage.tracks ?? []).find((item) =>
      (item.stages ?? []).some((stage) => stage.id === stageId),
    );
    const stage = track?.stages?.find((item) => item.id === stageId);
    if (!track || !stage)
      throw new ResourceNotFoundException("Etapa do material não encontrada");
    return this.render(
      contentPackage,
      [{ track, stage }],
      `${track.audienceName} · ${ageRange(track)}`,
      format,
      [
        contentPackage.theme,
        track.audienceName,
        STAGE_DOCUMENT_TITLES[stage.stageType],
      ],
    );
  }

  /** Documento da versão atual da etapa (para o editor): o editado à mão ou, se não houver, o montado dos campos. */
  async stageDocumentFor(
    packageId: string,
    stageId: string,
  ): Promise<{
    document: TiptapDocument;
    edited: boolean;
    versionId: string | null;
  }> {
    const contentPackage = await this.load(packageId);
    const stage = (contentPackage.tracks ?? [])
      .flatMap((track) => track.stages ?? [])
      .find((item) => item.id === stageId);
    if (!stage)
      throw new ResourceNotFoundException("Etapa do material não encontrada");
    const version = stage.currentVersion;
    const edited = version?.contentDocument as
      | TiptapDocument
      | null
      | undefined;
    if (edited && edited.type === "doc")
      return { document: edited, edited: true, versionId: version?.id ?? null };
    return {
      document: buildStageDocument(
        stage.stageType as ContentStageType,
        version?.structuredContent ?? {},
      ),
      edited: false,
      versionId: version?.id ?? null,
    };
  }

  async exportTrack(
    packageId: string,
    audience: ContentAudience,
    format: StudioExportFormat,
  ): Promise<StudioExportFile> {
    const contentPackage = await this.load(packageId);
    const track = (contentPackage.tracks ?? []).find(
      (item) => item.audience === audience,
    );
    if (!track)
      throw new ResourceNotFoundException(
        "Faixa etária não encontrada neste material",
      );
    const stages = this.orderedStages(track).map((stage) => ({ track, stage }));
    return this.render(
      contentPackage,
      stages,
      `${track.audienceName} · ${ageRange(track)}`,
      format,
      [contentPackage.theme, track.audienceName],
    );
  }

  async exportPackage(
    packageId: string,
    format: StudioExportFormat,
  ): Promise<StudioExportFile> {
    const contentPackage = await this.load(packageId);
    const tracks = [...(contentPackage.tracks ?? [])].sort(
      (a, b) => a.minimumAge - b.minimumAge,
    );
    const stages = tracks.flatMap((track) =>
      this.orderedStages(track).map((stage) => ({ track, stage })),
    );
    return this.render(
      contentPackage,
      stages,
      "Todas as faixas etárias",
      format,
      [contentPackage.theme],
    );
  }

  private orderedStages(track: ContentTrackEntity): ContentStageEntity[] {
    return [...(track.stages ?? [])].sort((a, b) => a.position - b.position);
  }

  private async load(packageId: string): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.findByIdWithGraph(packageId);
    if (!contentPackage)
      throw new ResourceNotFoundException(
        "Material para visita não encontrado",
      );
    return contentPackage;
  }

  private stageDocument(stage: ContentStageEntity): TiptapDocument | null {
    const version = stage.currentVersion;
    if (!version) return null;
    const edited = version.contentDocument as TiptapDocument | null;
    const document =
      edited && edited.type === "doc"
        ? edited
        : buildStageDocument(
            stage.stageType as ContentStageType,
            version.structuredContent,
          );
    return document.content.length > 0 ? document : null;
  }

  /** Imagens da versão atual, na ordem do plano, prontas para virar uma página cada. */
  private async visualPages(stage: ContentStageEntity): Promise<{
    pages: NonNullable<StudioDocxStage["imagePages"]>;
    fingerprint: string;
  } | null> {
    const version = stage.currentVersion;
    if (!version) return null;
    const content = version.structuredContent as {
      visualConfig?: { orientation?: string };
    };
    const verse = stage.stageType === ContentStageType.VERSE_VISUALS;
    const fun =
      stage.stageType === ContentStageType.VERSE_FIXATION ||
      stage.stageType === ContentStageType.STANDARD_GAME;
    const stored = await this.assets.listForVersion(version.id);
    const bySlot = new Map(stored.map((asset) => [asset.slot, asset]));
    const order = plannedImageSlots(
      stage.stageType as ContentStageType,
      version.structuredContent ?? {},
    ).map((item) => item.slot);
    const images: NonNullable<
      StudioDocxStage["imagePages"]
    >["images"][number][] = [];
    const checksums: string[] = [];
    for (const slot of order) {
      const asset = bySlot.get(slot);
      if (!asset) continue;
      const bytes = await this.s3.downloadOwned(
        this.s3.buildUrl(asset.storageKey),
        MAX_EXPORT_IMAGE_BYTES,
      );
      const size = await imageDimensions(bytes);
      images.push({ bytes, ...size });
      checksums.push(asset.checksum);
    }
    if (images.length === 0) return null;
    return {
      pages: {
        images,
        // Cartões do versículo são sempre paisagem; os visuais da lição seguem a escolha do admin.
        orientation:
          fun || (!verse && content.visualConfig?.orientation === "PORTRAIT")
            ? "PORTRAIT"
            : "LANDSCAPE",
      },
      fingerprint: createHash("sha256")
        .update(checksums.join(","))
        .digest("hex"),
    };
  }

  private async render(
    contentPackage: ContentPackageEntity,
    entries: ReadonlyArray<{
      track: ContentTrackEntity;
      stage: ContentStageEntity;
    }>,
    audienceLabel: string,
    format: StudioExportFormat,
    fileNameParts: readonly string[],
  ): Promise<StudioExportFile> {
    const multiTrack = new Set(entries.map((entry) => entry.track.id)).size > 1;
    const sections: StudioDocxStage[] = [];
    const versionKeys: string[] = [];
    for (const { track, stage } of entries) {
      // Visuais da lição e do versículo: sem documento de texto; só as imagens, uma por página.
      if (
        stage.stageType === ContentStageType.LESSON_VISUALS ||
        stage.stageType === ContentStageType.VERSE_VISUALS
      ) {
        const pages = await this.visualPages(stage);
        if (!pages) continue;
        sections.push({
          title: STAGE_DOCUMENT_TITLES[stage.stageType],
          audienceName: track.audienceName,
          document: { type: "doc", content: [] },
          imagePages: pages.pages,
        });
        versionKeys.push(
          `${stage.id}:${stage.currentVersion?.id}:${pages.fingerprint}`,
        );
        continue;
      }
      // Fixação e brincadeira: o documento E, no fim, a imagem compilada (infográfico) em uma página de retrato.
      if (
        stage.stageType === ContentStageType.VERSE_FIXATION ||
        stage.stageType === ContentStageType.STANDARD_GAME
      ) {
        const doc = this.stageDocument(stage);
        const pages = await this.visualPages(stage);
        if (!doc && !pages) continue;
        sections.push({
          title: multiTrack
            ? `${track.audienceName.toUpperCase()} · ${STAGE_DOCUMENT_TITLES[stage.stageType]}`
            : STAGE_DOCUMENT_TITLES[stage.stageType],
          audienceName: track.audienceName,
          document: doc ?? { type: "doc", content: [] },
          ...(pages ? { imagePages: pages.pages } : {}),
        });
        versionKeys.push(
          `${stage.id}:${stage.currentVersion?.id}:${stage.currentVersion?.contentChecksum}:${pages?.fingerprint ?? ""}`,
        );
        continue;
      }
      const document = this.stageDocument(stage);
      if (!document) continue;
      sections.push({
        title: multiTrack
          ? `${track.audienceName.toUpperCase()} · ${STAGE_DOCUMENT_TITLES[stage.stageType]}`
          : STAGE_DOCUMENT_TITLES[stage.stageType],
        audienceName: track.audienceName,
        document,
      });
      versionKeys.push(
        `${stage.id}:${stage.currentVersion?.id}:${stage.currentVersion?.contentChecksum}`,
      );
    }
    if (sections.length === 0) {
      throw new UnprocessableEntityException(
        "Ainda não há conteúdo para exportar. Gere ou escreva ao menos uma etapa.",
      );
    }

    const docx = await this.docx.build(
      {
        theme: contentPackage.theme,
        biblicalReferences: contentPackage.biblicalReferences,
        audienceLabel,
        generatedAt: new Date(),
      },
      sections,
    );
    const fileName = exportFileName(fileNameParts, format);
    if (format === StudioExportFormat.DOCX)
      return { buffer: docx, fileName, contentType: CONTENT_TYPES[format] };

    // Versões são imutáveis: o mesmo conjunto de versões gera o mesmo PDF (cache do conversor).
    const cacheKey = createHash("sha256")
      .update(versionKeys.join("|"))
      .digest("hex");
    return {
      buffer: await this.pdf.convertDocxToPdf(docx, cacheKey),
      fileName,
      contentType: CONTENT_TYPES[format],
    };
  }
}
