import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

export const CONTENT_PACKAGE_TRANSITIONS: Readonly<
  Record<ContentPackageStatus, readonly ContentPackageStatus[]>
> = {
  [ContentPackageStatus.DRAFT]: [
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.ARCHIVED,
  ],
  // As categorias são independentes: uma aprovada deixa o pacote publicável mesmo que as outras estejam em produção,
  // em revisão ou devolvidas. Por isso "pronto para publicar" e "publicando" valem a partir de qualquer estado de trabalho.
  [ContentPackageStatus.IN_PROGRESS]: [
    ContentPackageStatus.PACKAGE_READY,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.PACKAGE_READY]: [
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.IN_REVIEW]: [
    ContentPackageStatus.CHANGES_REQUESTED,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.ARCHIVED,
  ],
  // A publicação é por categoria: uma categoria aprovada deixa o pacote publicável mesmo que outra tenha sido
  // devolvida (CHANGES_REQUESTED → READY_FOR_PUBLICATION) e uma devolução não esconde a que já está pronta
  // (READY_FOR_PUBLICATION → CHANGES_REQUESTED).
  [ContentPackageStatus.CHANGES_REQUESTED]: [
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.ARCHIVED,
  ],
  [ContentPackageStatus.READY_FOR_PUBLICATION]: [
    ContentPackageStatus.PUBLISHING,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.IN_PROGRESS,
    ContentPackageStatus.CHANGES_REQUESTED,
    ContentPackageStatus.ARCHIVED,
  ],
  // Depois de publicar algumas categorias o pacote volta ao caminho das que faltam; só vira PUBLISHED com todas.
  [ContentPackageStatus.PUBLISHING]: [
    ContentPackageStatus.PUBLISHED,
    ContentPackageStatus.READY_FOR_PUBLICATION,
    ContentPackageStatus.IN_REVIEW,
    ContentPackageStatus.CHANGES_REQUESTED,
    ContentPackageStatus.IN_PROGRESS,
  ],
  [ContentPackageStatus.PUBLISHED]: [ContentPackageStatus.ARCHIVED],
  [ContentPackageStatus.ARCHIVED]: [],
};

export const CONTENT_STAGE_TRANSITIONS: Readonly<
  Record<ContentStageStatus, readonly ContentStageStatus[]>
> = {
  [ContentStageStatus.NOT_STARTED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
    ContentStageStatus.NOT_REQUIRED,
  ],
  [ContentStageStatus.GENERATING]: [
    ContentStageStatus.DRAFT,
    ContentStageStatus.FAILED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.DRAFT]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
    ContentStageStatus.PRODUCER_APPROVED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.PRODUCER_APPROVED]: [
    ContentStageStatus.IN_REVIEW,
    ContentStageStatus.DRAFT,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.IN_REVIEW]: [
    ContentStageStatus.APPROVED,
    ContentStageStatus.CHANGES_REQUESTED,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.APPROVED]: [
    ContentStageStatus.DRAFT,
    ContentStageStatus.STALE,
  ],
  [ContentStageStatus.FAILED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.STALE]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.CHANGES_REQUESTED]: [
    ContentStageStatus.GENERATING,
    ContentStageStatus.DRAFT,
  ],
  [ContentStageStatus.NOT_REQUIRED]: [],
};
