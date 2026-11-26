import type { ContentAudience } from "./enums/content-audience.enum";
import type { ContentStageType } from "./enums/content-stage-type.enum";
import type { ContentPublicationEntity } from "./entities/content-publication.entity";

/** Track facts needed to build the documents of the published page. */
export interface PublicationTrackSnapshot {
  readonly audience: ContentAudience;
  readonly audienceName: string;
  readonly minimumAge: number;
  readonly maximumAge: number | null;
  /** Os itens obrigatórios da categoria, na ordem do material: cada um vira um PDF próprio na página. */
  readonly stages: readonly {
    readonly id: string;
    readonly stageType: ContentStageType;
  }[];
}

/** What the publication needs from the package, read under lock (no entity leaks out of the repository). */
export interface PublicationPackageSnapshot {
  readonly packageId: string;
  readonly theme: string;
  readonly biblicalReferences: string;
  readonly canonicalObjective: string;
  /** Capa do material (imagem do card); `null` = imagem padrão. */
  readonly coverImageUrl?: string | null;
  /** Só as categorias que ESTA publicação leva à página (aprovadas e ainda não publicadas). */
  readonly tracks: readonly PublicationTrackSnapshot[];
  /**
   * O "Material completo" só entra quando, depois desta publicação, todas as categorias estão na página (e há mais
   * de uma): antes disso ele não existe, para não descrever categorias que ainda não foram aprovadas.
   */
  readonly includeCompleteMaterial: boolean;
}

export interface BegunPublication {
  readonly publication: ContentPublicationEntity;
  readonly snapshot: PublicationPackageSnapshot;
}

/** Rendered document ready to be sent as a synthetic multipart file. */
export interface PublicationDocumentFile {
  /** Categoria do documento (o PDF de um item de uma faixa); sem ela, vai para "Geral" (ex.: material completo). */
  readonly audience?: ContentAudience;
  readonly title: string;
  readonly description: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly buffer: Buffer;
}

/** Location of the published page, resolved through the visit-material service. */
export interface PublishedPageRef {
  readonly id: string;
  readonly path: string | null;
  /** Categorias que a página já tem (uma seção por categoria): a publicação incremental só acrescenta as que faltam. */
  readonly categories: readonly string[];
}
