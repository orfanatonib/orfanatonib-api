import { createHash, randomUUID } from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { AiGenerationGateway } from "../ai/ai-generation.gateway";
import { AiProviderErrorKind } from "../ai/enums/ai-provider-error-kind.enum";
import {
  imageSizeFor,
  lessonVisualImageSpecs,
  verseCardImageSpecs,
  funSummaryImageSpecs,
  type ImageSpec,
} from "../ai/generation/image-prompts";
import {
  isCompiledSlot,
  LessonVisualFormat,
} from "../ai/generation/visual-art.constants";
import {
  ContentVisualOrientation,
  ContentVisualStyle,
} from "../enums/content-visual.enums";
import { AiProviderRequestError } from "../ai/openai-generation.gateway";
import {
  FIXATION_PIECE_REFERENCE_RULE,
  isFixationPieceSlot,
} from "../ai/generation/verse-fixation.constants";
import { GENERATION_LEASE_MS } from "../ai/stage-generation.constants";
import {
  cropToA4,
  padToA4,
  toReferenceImage,
} from "../ai/utils/image-processing.util";
import type { ImageReference } from "../ai/types";
import type { VisualConfig } from "../dto/visual-config.dto";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { ContentAssetRepository } from "../repositories/content-asset.repository";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";
import type { ImageJobProgress, StartedGenerationJob } from "../types";

/** Quantas imagens o provedor gera ao mesmo tempo, e tentativas por imagem antes de desistir dela. */
const IMAGE_CONCURRENCY = 2;
const IMAGE_ATTEMPTS = 2;
const DEFAULT_IMAGE_QUALITY = "medium";
/** Teto do arquivo lido do bucket para servir de referência (as imagens geradas têm até 10 MB). */
const REFERENCE_MAX_BYTES = 12 * 1024 * 1024;

interface ImageJobRequest {
  readonly versionId?: string;
  readonly slots?: readonly string[] | null;
  readonly instructions?: string | null;
}

/**
 * Gera de verdade as imagens de uma versão (modelo do Clubinho): uma por prancha/cena, com o desenho e a
 * direção de arte escolhidos, recortada para a folha A4, guardada no bucket e registrada em `content_assets`.
 * Uma imagem que falha não derruba as outras: ela fica marcada como pendente e pode ser refeita.
 */
@Injectable()
export class ProcessStageImagesService {
  private readonly logger = new Logger(ProcessStageImagesService.name);

  constructor(
    private readonly generations: ContentGenerationRepository,
    private readonly assets: ContentAssetRepository,
    private readonly gateway: AiGenerationGateway,
    private readonly s3: AwsS3Service,
    private readonly config: ConfigService,
  ) {}

  async process(job: StartedGenerationJob): Promise<ImageJobProgress> {
    const request = (job.request ?? {}) as ImageJobRequest;
    if (!request.versionId)
      throw new AiProviderRequestError(
        AiProviderErrorKind.SCHEMA,
        "image_job_without_version",
      );
    const context = await this.generations.loadStageImageContext(
      job.stageId,
      request.versionId,
    );
    const isVerse = context?.stageType === ContentStageType.VERSE_VISUALS;
    const isFun =
      context?.stageType === ContentStageType.VERSE_FIXATION ||
      context?.stageType === ContentStageType.STANDARD_GAME;
    const lessonConfig = context?.content.visualConfig as
      | VisualConfig
      | undefined;
    if (
      !context ||
      (!isVerse &&
        !isFun &&
        (String(context.stageType) !==
          String(ContentStageType.LESSON_VISUALS) ||
          !lessonConfig))
    )
      throw new AiProviderRequestError(
        AiProviderErrorKind.SCHEMA,
        "image_context_not_found",
      );
    // Cartões do versículo não têm perguntas: sempre paisagem (A4 deitado), de ponta a ponta.
    // A imagem compilada da fixação e da brincadeira é um infográfico em retrato (A4 em pé).
    const config: VisualConfig = isFun
      ? {
          quantity: 0,
          format: LessonVisualFormat.STORY_SCENES,
          style: ContentVisualStyle.CUTE_CARTOON,
          orientation: ContentVisualOrientation.PORTRAIT,
        }
      : isVerse
        ? {
            quantity: 0,
            format: LessonVisualFormat.STORY_SCENES,
            style: ContentVisualStyle.CUTE_CARTOON,
            orientation: ContentVisualOrientation.LANDSCAPE,
          }
        : (lessonConfig as VisualConfig);

    const extra = [config.instructions, request.instructions]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" ");
    const withExtra = (spec: ImageSpec): ImageSpec => ({
      ...spec,
      instructions: extra
        ? [...spec.instructions, `ORIENTAÇÃO EXTRA DO ADMINISTRADOR: ${extra}`]
        : spec.instructions,
    });
    const specs = isFun
      ? funSummaryImageSpecs(
          context.stageType as ContentStageType,
          context.content,
          context.audience as ContentAudience,
          request.slots,
        ).map(withExtra)
      : isVerse
        ? verseCardImageSpecs(
            context.content,
            context.audience as ContentAudience,
            request.slots,
          ).map((spec) => ({
            ...spec,
            instructions: extra
              ? [
                  ...spec.instructions,
                  `ORIENTAÇÃO EXTRA DO ADMINISTRADOR: ${extra}`,
                ]
              : spec.instructions,
          }))
        : lessonVisualImageSpecs(
            context.content,
            { ...config, instructions: extra || null },
            context.audience as ContentAudience,
            request.slots,
          );
    const where = `job=${job.jobId} pacote=${context.packageId} etapa=${job.stageId} versao=${context.versionId}`;
    this.logger.log(
      `Imagens iniciadas ${where} total=${specs.length} desenho=${config.style} formato=${config.format}`,
    );

    const failed: string[] = [];
    let done = 0;
    let lastError: unknown = null;
    const report = () =>
      this.generations.updateJobProgress(
        job.jobId,
        { phase: "IMAGES", done, total: specs.length, failed },
        GENERATION_LEASE_MS,
      );
    await report();

    // Peças com referência: a peça-modelo deste lote sai primeiro, sem referência; as que a copiam vêm depois.
    const batch = new Set(specs.map((spec) => spec.slot));
    const isModel = (spec: ImageSpec) =>
      !!spec.referenceSlot &&
      batch.has(spec.referenceSlot) &&
      spec.slot < spec.referenceSlot;
    const waitsModel = (spec: ImageSpec) =>
      !!spec.referenceSlot && batch.has(spec.referenceSlot) && !isModel(spec);
    const runAll = async (group: ImageSpec[]) => {
      const queue = [...group];
      await Promise.all(
        Array.from({ length: Math.min(IMAGE_CONCURRENCY, queue.length) }, () =>
          worker(queue),
        ),
      );
    };
    const worker = async (queue: ImageSpec[]) => {
      for (let spec = queue.shift(); spec; spec = queue.shift()) {
        try {
          const reference = isModel(spec)
            ? null
            : await this.loadReference(context.versionId, spec, where);
          await this.generateOne(job, context, config, spec, reference);
          done += 1;
        } catch (error: unknown) {
          lastError = error;
          failed.push(spec.slot);
          this.logger.error(
            `Imagem falhou ${where} item=${spec.slot} tipo_erro=${
              error instanceof AiProviderRequestError ? error.kind : "UNKNOWN"
            }${
              error instanceof AiProviderRequestError
                ? error.detail
                  ? ` causa=${error.detail}`
                  : ""
                : error instanceof Error
                  ? ` causa=${error.name}: ${error.message.slice(0, 120)}`
                  : ""
            }`,
          );
        }
        await report();
      }
    };
    await runAll(specs.filter((spec) => !waitsModel(spec)));
    await runAll(specs.filter(waitsModel));

    const progress: ImageJobProgress = {
      phase: "IMAGES",
      done,
      total: specs.length,
      failed,
    };
    // Nada gerado: o job falha (e o motivo vai para o log e a auditoria); com parte pronta, fica "parcial".
    if (done === 0 && specs.length > 0) throw lastError;
    await this.generations.markJobSucceeded(job.jobId, progress);
    this.logger.log(
      `Imagens concluídas ${where} geradas=${done} falhas=${failed.length}`,
    );
    return progress;
  }

  /**
   * A imagem que serve de modelo para esta (a primeira peça do jogo), reduzida. Sem modelo disponível, a peça
   * é gerada só pelo texto do prompt, como antes: a referência melhora o resultado, mas nunca bloqueia.
   */
  private async loadReference(
    versionId: string,
    spec: ImageSpec,
    where: string,
  ): Promise<ImageReference | null> {
    if (!spec.referenceSlot) return null;
    try {
      const asset = await this.assets.findGeneratedSlot(
        versionId,
        spec.referenceSlot,
      );
      if (!asset) return null;
      const original = await this.s3.downloadOwned(
        this.s3.buildUrl(asset.storageKey),
        REFERENCE_MAX_BYTES,
      );
      return {
        mediaType: "image/png",
        bytes: await toReferenceImage(original),
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Referência indisponível ${where} item=${spec.slot} modelo=${spec.referenceSlot} causa=${
          error instanceof Error ? error.name : "UNKNOWN"
        }`,
      );
      return null;
    }
  }

  private async generateOne(
    job: StartedGenerationJob,
    context: {
      packageId: string;
      stageId: string;
      versionId: string;
    },
    config: VisualConfig,
    spec: ImageSpec,
    reference: ImageReference | null,
  ): Promise<void> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= IMAGE_ATTEMPTS; attempt += 1) {
      try {
        const result = await this.gateway.generateImage({
          correlationId: `${job.jobId}:${spec.slot}:${attempt}`,
          instructions: reference
            ? [...spec.instructions, FIXATION_PIECE_REFERENCE_RULE]
            : spec.instructions,
          input: { item: spec.slot },
          ...(reference ? { referenceImages: [reference] } : {}),
          size: spec.size ?? imageSizeFor(config.orientation),
          quality:
            this.config.get<string>("CONTENT_STUDIO_IMAGE_QUALITY") ??
            DEFAULT_IMAGE_QUALITY,
        });
        // A folha segue a proporção pedida ao gerador (a fixação é paisagem; a brincadeira, retrato).
        const orientation =
          spec.size === "1536x1024"
            ? ContentVisualOrientation.LANDSCAPE
            : spec.size === "1024x1536"
              ? ContentVisualOrientation.PORTRAIT
              : config.orientation;
        // Infográfico compilado e peças do jogo: nada pode ser cortado (ficam inteiros na folha); as demais, recorte A4.
        const processed =
          isCompiledSlot(spec.slot) || isFixationPieceSlot(spec.slot)
            ? await padToA4(
                result.bytes,
                orientation,
                // Fixação com peças (paisagem): sobra branca; a borda repetida deixava faixas riscadas na folha.
                orientation === ContentVisualOrientation.LANDSCAPE,
              )
            : await cropToA4(result.bytes, orientation);
        const key = `${this.s3.getEnvironment()}/content-studio/${context.packageId}/${context.stageId}/${context.versionId}/${spec.slot}-${randomUUID().slice(0, 8)}.png`;
        await this.s3.putObject(key, processed.bytes, processed.mediaType);
        const replaced = await this.assets.replaceSlot({
          packageId: context.packageId,
          stageId: context.stageId,
          versionId: context.versionId,
          slot: spec.slot,
          storageKey: key,
          mediaType: processed.mediaType,
          sizeBytes: processed.bytes.length,
          checksum: createHash("sha256").update(processed.bytes).digest("hex"),
        });
        // A imagem antiga só sai do bucket depois de a nova estar registrada (falha aqui não desfaz nada).
        for (const old of replaced)
          await this.s3.deleteKey(old).catch(() => undefined);
        this.logger.log(
          `Imagem pronta job=${job.jobId} item=${spec.slot} provedor=${result.provider} modelo=${result.model} referencia=${reference ? spec.referenceSlot : "nenhuma"} duracaoMs=${result.durationMs} tentativa=${attempt}`,
        );
        return;
      } catch (error: unknown) {
        lastError = error;
        // Recusa de segurança ou chave inválida não melhora tentando de novo.
        if (
          error instanceof AiProviderRequestError &&
          [
            AiProviderErrorKind.SAFETY,
            AiProviderErrorKind.AUTHENTICATION,
            AiProviderErrorKind.QUOTA,
          ].includes(error.kind)
        )
          break;
      }
    }
    throw lastError;
  }
}
