import { randomUUID } from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { GetVisitMaterialPageService } from "src/content/page/visit-material-page/services/get-visit-material-page.service";
import { SetVisitMaterialPageCoverService } from "src/content/page/visit-material-page/services/set-visit-material-page-cover.service";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";

import { AiGenerationGateway } from "../ai/ai-generation.gateway";
import { AiProviderErrorKind } from "../ai/enums/ai-provider-error-kind.enum";
import { AiProviderRequestError } from "../ai/openai-generation.gateway";
import { containsSensitiveContentInstruction } from "../ai/utils/ai-provider-policy.util";
import { cropToCover } from "../ai/utils/image-processing.util";
import { CONTENT_COVER } from "../constants/content-cover.constants";
import { ContentPackageEntity } from "../entities/content-package.entity";
import {
  buildCoverBriefInput,
  buildCoverImageInstructions,
  COVER_BRIEF_INSTRUCTIONS,
  COVER_BRIEF_SCHEMA,
  fallbackCoverBrief,
  parseCoverBrief,
  type ContentCoverBrief,
  type ContentCoverSource,
} from "../utils/content-cover.utils";

/**
 * Desenha e guarda a capa (imagem de apresentação) do material, no modelo do Clubinho: o modelo de texto escreve um
 * briefing curto (título simplificado, protagonista, cena) e o de imagem o desenha. O briefing nunca derruba a capa:
 * sem ele, a imagem sai só do tema. A capa NÃO passa por revisão e pode ser refeita a qualquer momento; se o
 * material já foi publicado, o card da página publicada troca junto.
 */
@Injectable()
export class GeneratePackageCoverService {
  private readonly logger = new Logger(GeneratePackageCoverService.name);
  /** Capas em desenho neste processo (a tela consulta para mostrar "gerando"). */
  private readonly running = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(ContentPackageEntity)
    private readonly packages: Repository<ContentPackageEntity>,
    private readonly gateway: AiGenerationGateway,
    private readonly s3: AwsS3Service,
    private readonly config: ConfigService,
    private readonly pages: GetVisitMaterialPageService,
    private readonly pageCover: SetVisitMaterialPageCoverService,
  ) {}

  isGenerating(packageId: string): boolean {
    return this.running.has(packageId);
  }

  /**
   * Começa a desenhar em segundo plano (não espera). Já em andamento: não duplica. Falha só vai para o log: a tela
   * mostra o botão de refazer. `instructions` é uma orientação extra do administrador.
   */
  start(packageId: string, instructions?: string | null): void {
    if (this.running.has(packageId)) return;
    const task = this.generate(packageId, instructions)
      .then(() => undefined)
      .catch((error: unknown) =>
        this.logger.error(
          `Capa do pacote ${packageId} falhou: ${
            error instanceof AiProviderRequestError
              ? `${error.kind}${error.detail ? ` (${error.detail})` : ""}`
              : error instanceof Error
                ? error.message.slice(0, 200)
                : String(error)
          }`,
        ),
      )
      .finally(() => this.running.delete(packageId));
    this.running.set(packageId, task);
  }

  /** Valida o pedido do administrador e inicia; falha cedo se o pacote não existe. */
  async request(
    packageId: string,
    instructions?: string | null,
  ): Promise<void> {
    const extra = instructions?.trim() || null;
    if (extra && containsSensitiveContentInstruction(extra))
      throw new RuleException(
        "A orientação não pode conter dados pessoais nem informações sensíveis de pessoas acolhidas",
        { field: "instructions" },
      );
    const exists = await this.packages.exist({ where: { id: packageId } });
    if (!exists)
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado", {
        id: packageId,
      });
    this.start(packageId, extra);
  }

  /** Desenha, guarda e liga a capa ao pacote (e à página publicada, se houver); devolve a URL nova. */
  async generate(
    packageId: string,
    instructions?: string | null,
  ): Promise<string> {
    const pack = await this.packages.findOne({ where: { id: packageId } });
    if (!pack)
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado", {
        id: packageId,
      });
    const source: ContentCoverSource = pack;
    const brief = await this.writeBrief(packageId, source);
    const image = await this.drawImage(packageId, source, brief, instructions);
    const key = `${this.s3.getEnvironment()}/content-studio/${packageId}/${CONTENT_COVER.STORAGE_FOLDER}-${randomUUID().slice(0, 8)}.png`;
    const url = await this.s3.putObject(key, image, "image/png");

    const previous = pack.coverImageUrl;
    try {
      await this.packages.update({ id: packageId }, { coverImageUrl: url });
      const page = await this.pages.findBySourceLessonId(packageId);
      if (page?.route?.id) await this.pageCover.execute(page.route.id, url);
    } catch (error: unknown) {
      // Nada liga a imagem nova: ela seria lixo no bucket.
      await this.s3.deleteKey(key).catch(() => undefined);
      throw error;
    }
    const oldKey = previous ? this.s3.keyFromOwnedUrl(previous) : null;
    if (oldKey) await this.s3.deleteKey(oldKey).catch(() => undefined);
    this.logger.log(`Capa do pacote ${packageId} pronta (${key})`);
    return url;
  }

  private async writeBrief(
    packageId: string,
    source: ContentCoverSource,
  ): Promise<ContentCoverBrief> {
    for (
      let attempt = 1;
      attempt <= CONTENT_COVER.BRIEF_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const answer = await this.gateway.generateStructuredText({
          correlationId: `cover-brief:${packageId}:${attempt}`,
          instructions: COVER_BRIEF_INSTRUCTIONS,
          input: buildCoverBriefInput(source),
          outputSchema: COVER_BRIEF_SCHEMA,
          maxOutputTokens: 1200,
        });
        const parsed = parseCoverBrief(answer.output, source);
        if ("brief" in parsed) return parsed.brief;
        this.logger.warn(
          `Briefing da capa ${packageId} inválido (tentativa ${attempt}): ${parsed.problem}`,
        );
      } catch (error: unknown) {
        this.logger.warn(
          `Briefing da capa ${packageId} falhou (tentativa ${attempt}): ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`,
        );
      }
    }
    this.logger.warn(
      `Capa ${packageId} será desenhada sem briefing, só com o tema.`,
    );
    return fallbackCoverBrief(source);
  }

  private async drawImage(
    packageId: string,
    source: ContentCoverSource,
    brief: ContentCoverBrief,
    instructions?: string | null,
  ): Promise<Buffer> {
    let lastError: unknown = null;
    for (
      let attempt = 1;
      attempt <= CONTENT_COVER.IMAGE_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const result = await this.gateway.generateImage({
          correlationId: `cover:${packageId}:${attempt}`,
          instructions: buildCoverImageInstructions(
            brief,
            source,
            instructions,
          ),
          input: { item: "cover" },
          size: CONTENT_COVER.IMAGE_SIZE,
          quality:
            this.config.get<string>("CONTENT_STUDIO_IMAGE_QUALITY") ??
            CONTENT_COVER.DEFAULT_QUALITY,
        });
        return (await cropToCover(result.bytes)).bytes;
      } catch (error: unknown) {
        lastError = error;
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
