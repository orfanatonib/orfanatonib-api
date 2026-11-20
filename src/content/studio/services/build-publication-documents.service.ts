import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";

import {
  CONTENT_PUBLICATION_FULL_PACKAGE_LABEL,
  CONTENT_PUBLICATION_STAGE_LABELS,
} from "../constants/content-publication.constants";
import type {
  PublicationDocumentFile,
  PublicationPackageSnapshot,
} from "../content-publication.types";
import {
  StudioExportFormat,
  StudioExportService,
  type StudioExportFile,
} from "../export/studio-export.service";

/**
 * Renders the documents of the page from the CURRENT saved versions, which are the approved ones: approval is of the
 * current version and any later save moves the stage out of APPROVED (so the package leaves READY_FOR_PUBLICATION).
 * Tudo é PDF, e UM PDF POR ITEM de cada categoria (Lição, Visuais da lição, Visual do versículo, Fixação, Brincadeira),
 * na ordem do material; mais o material completo (PDF) só quando esta publicação deixa todas as categorias na página.
 */
@Injectable()
export class BuildPublicationDocumentsService {
  private readonly logger = new Logger(BuildPublicationDocumentsService.name);

  constructor(private readonly exports: StudioExportService) {}

  async execute(
    snapshot: PublicationPackageSnapshot,
  ): Promise<PublicationDocumentFile[]> {
    const documents: PublicationDocumentFile[] = [];
    for (const track of snapshot.tracks) {
      let published = 0;
      for (const stage of track.stages) {
        let file: StudioExportFile;
        try {
          file = await this.exports.exportStage(
            snapshot.packageId,
            stage.id,
            StudioExportFormat.PDF,
          );
        } catch (error) {
          // Item sem nada para imprimir (ex.: visuais sem imagem): não vira documento vazio e não barra os demais.
          if (error instanceof UnprocessableEntityException) {
            this.logger.warn(
              `Item ${stage.stageType} de ${track.audienceName} sem conteúdo para PDF: não entra na página (${snapshot.packageId})`,
            );
            continue;
          }
          throw error;
        }
        published += 1;
        documents.push({
          ...this.toDocument(
            file,
            CONTENT_PUBLICATION_STAGE_LABELS[stage.stageType],
            track.audienceName,
          ),
          audience: track.audience,
        });
      }
      if (published === 0) {
        throw new UnprocessableEntityException(
          `Nenhum item de ${track.audienceName} tem conteúdo para publicar`,
        );
      }
    }
    if (snapshot.includeCompleteMaterial) {
      const file = await this.exports.exportPackage(
        snapshot.packageId,
        StudioExportFormat.PDF,
      );
      documents.push(
        this.toDocument(
          file,
          CONTENT_PUBLICATION_FULL_PACKAGE_LABEL,
          snapshot.biblicalReferences,
        ),
      );
    }
    return documents;
  }

  private toDocument(
    file: StudioExportFile,
    title: string,
    description: string,
  ): PublicationDocumentFile {
    return {
      title,
      description,
      fileName: file.fileName,
      contentType: file.contentType,
      buffer: file.buffer,
    };
  }
}
