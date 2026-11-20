import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

/** O mínimo que as regras de publicação por categoria precisam de uma etapa. */
export interface PublicationRuleStage {
  readonly status: ContentStageStatus;
  readonly required: boolean;
  readonly currentVersionId: string | null;
}

/** O mínimo que as regras precisam de uma categoria (trilha). */
export interface PublicationRuleTrack {
  readonly audience: string;
  readonly publishedAt: Date | null;
  readonly stages?: readonly PublicationRuleStage[] | null;
}

/** Etapa que a produção já liberou para a revisão (está ou esteve nas mãos do revisor). */
const RELEASED_STAGE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.IN_REVIEW,
  ContentStageStatus.APPROVED,
  ContentStageStatus.CHANGES_REQUESTED,
];

const requiredStages = (
  track: PublicationRuleTrack,
): readonly PublicationRuleStage[] =>
  (track.stages ?? []).filter((stage) => stage.required);

/**
 * A categoria já está na página? Pacote antigo `PUBLISHED` publicou o pacote inteiro (antes de a publicação ser por
 * categoria), então todas as suas categorias contam como publicadas, sem precisar preencher dados antigos.
 */
export function isTrackPublished(
  track: Pick<PublicationRuleTrack, "publishedAt">,
  packageStatus: ContentPackageStatus,
): boolean {
  return (
    (track.publishedAt ?? null) !== null ||
    packageStatus === ContentPackageStatus.PUBLISHED
  );
}

/** A produção liberou esta categoria para a revisão? */
export function isTrackReleased(track: PublicationRuleTrack): boolean {
  return (track.stages ?? []).some((stage) =>
    RELEASED_STAGE_STATUSES.includes(stage.status),
  );
}

/** Pode ir para a página: todas as etapas obrigatórias aprovadas (e com versão) e ainda não publicada. */
export function isTrackPublishable(
  track: PublicationRuleTrack,
  packageStatus: ContentPackageStatus,
): boolean {
  if (isTrackPublished(track, packageStatus)) return false;
  const required = requiredStages(track);
  return (
    required.length > 0 &&
    required.every(
      (stage) =>
        stage.status === ContentStageStatus.APPROVED &&
        stage.currentVersionId !== null,
    )
  );
}

/** Categorias que uma publicação levaria agora, na ordem recebida. */
export function publishableTracks<T extends PublicationRuleTrack>(
  tracks: readonly T[],
  packageStatus: ContentPackageStatus,
): T[] {
  return tracks.filter((track) => isTrackPublishable(track, packageStatus));
}

/**
 * O pacote fica `READY_FOR_PUBLICATION` assim que existe ao menos uma categoria publicável. As demais seguem o seu
 * caminho (em revisão, devolvidas ou em produção) sem segurar a publicação das aprovadas.
 */
export function isReadyForPublication(
  tracks: readonly PublicationRuleTrack[],
  packageStatus: ContentPackageStatus,
): boolean {
  return publishableTracks(tracks, packageStatus).length > 0;
}

/**
 * Situação do pacote depois de uma publicação: todas as categorias na página → `PUBLISHED`; senão volta ao caminho
 * das que faltam (alguma em revisão, alguma devolvida) ou à produção.
 */
export function statusAfterPublication(
  tracks: readonly PublicationRuleTrack[],
  packageStatus: ContentPackageStatus,
  justPublished: readonly string[],
): ContentPackageStatus {
  if (areAllTracksPublishedAfter(tracks, packageStatus, justPublished))
    return ContentPackageStatus.PUBLISHED;
  const remaining = tracks
    .filter(
      (track) =>
        !isTrackPublished(track, packageStatus) &&
        !justPublished.includes(track.audience),
    )
    .flatMap((track) => track.stages ?? []);
  if (remaining.some((stage) => stage.status === ContentStageStatus.IN_REVIEW))
    return ContentPackageStatus.IN_REVIEW;
  if (
    remaining.some(
      (stage) => stage.status === ContentStageStatus.CHANGES_REQUESTED,
    )
  )
    return ContentPackageStatus.CHANGES_REQUESTED;
  if (remaining.some((stage) => stage.status === ContentStageStatus.APPROVED))
    return ContentPackageStatus.READY_FOR_PUBLICATION;
  return ContentPackageStatus.IN_PROGRESS;
}

/**
 * Situação de trabalho do pacote a partir das categorias AINDA não publicadas (usada quando a produção mexe em algum
 * item): uma categoria pronta para publicar vale mais que as outras; depois, as em revisão, as devolvidas e, por fim,
 * a produção. Assim gerar ou editar o TEEN não tira da fila de revisão o BABY que já está aprovado ou em revisão.
 */
export function workingPackageStatus(
  tracks: readonly PublicationRuleTrack[],
  packageStatus: ContentPackageStatus,
): ContentPackageStatus {
  if (isReadyForPublication(tracks, packageStatus))
    return ContentPackageStatus.READY_FOR_PUBLICATION;
  const open = tracks
    .filter((track) => !isTrackPublished(track, packageStatus))
    .flatMap((track) => track.stages ?? []);
  if (open.some((stage) => stage.status === ContentStageStatus.IN_REVIEW))
    return ContentPackageStatus.IN_REVIEW;
  if (
    open.some((stage) => stage.status === ContentStageStatus.CHANGES_REQUESTED)
  )
    return ContentPackageStatus.CHANGES_REQUESTED;
  return ContentPackageStatus.IN_PROGRESS;
}

/** Depois de publicar `justPublished`, todas as categorias do pacote estão na página? */
export function areAllTracksPublishedAfter(
  tracks: readonly PublicationRuleTrack[],
  packageStatus: ContentPackageStatus,
  justPublished: readonly string[],
): boolean {
  return (
    tracks.length > 0 &&
    tracks.every(
      (track) =>
        isTrackPublished(track, packageStatus) ||
        justPublished.includes(track.audience),
    )
  );
}
