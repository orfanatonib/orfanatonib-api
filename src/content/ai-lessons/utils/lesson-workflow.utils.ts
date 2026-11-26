import { createHash } from "node:crypto";
import { HttpException, HttpStatus } from "@nestjs/common";
import { lessonCategoryProfile } from "../constants/lesson-category-profiles.constants";
import {
  AppConflictException,
  AppException,
  ErrorCode,
} from "src/content/ai-lessons/compat/exceptions";
import { LessonEntity } from "../entities/lesson.entity";
import { LessonStageEntity } from "../entities/lesson-stage.entity";
import { LessonVersionEntity } from "../entities/lesson-version.entity";
import {
  getLessonStageOrder,
  LessonCategory,
  LessonStageStatus,
  LessonStageType,
  LessonStatus,
} from "../enums/lesson.enums";
import {
  LESSON_ASSET_LIST_KEYS,
  LESSON_PUBLICATION,
  LESSON_REVIEW_CYCLE_STAGE_STATUSES,
  LESSON_STAGE_COMPLETED_STATUSES,
  LESSON_STAGE_ITEM_NAMES,
  LESSON_STAGE_PDF,
  LESSON_TERMINAL_STATUSES,
} from "../constants/lesson-workflow.constants";
import type { LessonJsonObject } from "../types/lesson-generation.types";

export function lessonAsObject(value: unknown): LessonJsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LessonJsonObject)
    : {};
}

/** JSON with sorted keys: stable across MySQL JSON round-trips. */
export function lessonStableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => lessonStableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as LessonJsonObject;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${lessonStableStringify(record[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function lessonContentChecksum(value: LessonJsonObject): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function lessonCurrentVersion(
  stage: LessonStageEntity,
): LessonVersionEntity | undefined {
  return stage.versions?.find(
    (version) => version.id === stage.currentVersionId,
  );
}

export function lessonCurrentContent(
  stage: LessonStageEntity,
): LessonJsonObject | null {
  return (lessonCurrentVersion(stage)?.structuredDataJson ??
    null) as LessonJsonObject | null;
}

/** Requires the item right before this one to be concluded by the producer. */
export function assertPreviousStageCompleted(
  lesson: Pick<LessonEntity, "category" | "stages">,
  type: LessonStageType,
): void {
  const stageOrder = getLessonStageOrder(lesson.category);
  const index = stageOrder.indexOf(type);
  if (index <= 0) return;
  const dependency = lesson.stages.find(
    (stage) => stage.type === stageOrder[index - 1],
  );
  if (
    !dependency ||
    !LESSON_STAGE_COMPLETED_STATUSES.includes(dependency.status)
  )
    throw new AppConflictException(
      ErrorCode.LESSON_DEPENDENCY_INCOMPLETE,
      `A etapa ${stageOrder[index - 1]} precisa ser concluída pelo produtor.`,
    );
}

/**
 * Requires the previous stage to be concluded and returns the concluded
 * upstream content, in canonical production order.
 */
export function assertLessonDependency(
  lesson: LessonEntity,
  type: LessonStageType,
): LessonJsonObject | null {
  const stageOrder = getLessonStageOrder(lesson.category);
  const index = stageOrder.indexOf(type);
  if (index === 0) return null;
  assertPreviousStageCompleted(lesson, type);
  return Object.fromEntries(
    lesson.stages
      .filter(
        (stage) =>
          stageOrder.indexOf(stage.type) < index &&
          LESSON_STAGE_COMPLETED_STATUSES.includes(stage.status),
      )
      .sort((a, b) => stageOrder.indexOf(a.type) - stageOrder.indexOf(b.type))
      .map((stage) => [stage.type, lessonCurrentContent(stage)]),
  );
}

/**
 * Single source of the aggregate lesson status. Publication and archive
 * states are explicit transitions and are never derived from the stages.
 */
export function recomputeLessonStatus(
  category: LessonCategory | null | undefined,
  stages: ReadonlyArray<Pick<LessonStageEntity, "status" | "currentVersionId">>,
  current: LessonStatus,
): LessonStatus {
  if (LESSON_TERMINAL_STATUSES.includes(current)) return current;
  if (
    stages.length > 0 &&
    stages.every((stage) => stage.status === LessonStageStatus.NOT_STARTED)
  )
    return LessonStatus.DRAFT;
  const complete = stages.length === getLessonStageOrder(category).length;
  const settled = stages.every(
    (stage) =>
      Boolean(stage.currentVersionId) &&
      (LESSON_STAGE_COMPLETED_STATUSES.includes(stage.status) ||
        stage.status === LessonStageStatus.CHANGES_REQUESTED),
  );
  if (!complete || !settled) return LessonStatus.IN_PROGRESS;
  if (stages.every((stage) => stage.status === LessonStageStatus.APPROVED))
    return LessonStatus.READY_FOR_PUBLICATION;
  if (
    stages.some((stage) => stage.status === LessonStageStatus.CHANGES_REQUESTED)
  )
    return LessonStatus.CHANGES_REQUESTED;
  if (
    stages.some((stage) => stage.status === LessonStageStatus.PRODUCER_APPROVED)
  )
    return LessonStatus.PACKAGE_READY;
  return LessonStatus.IN_REVIEW;
}

/** Blocks every mutation while a generation or a publication is running. */
export function assertLessonMutable(
  lesson: Pick<LessonEntity, "status" | "stages">,
  message: string,
): void {
  if (lesson.status === LessonStatus.PUBLISHING)
    throw new AppConflictException(
      ErrorCode.LESSON_PUBLICATION_IN_PROGRESS,
      message,
    );
  if (
    (lesson.stages ?? []).some(
      (stage) => stage.status === LessonStageStatus.GENERATING,
    )
  )
    throw new AppConflictException(
      ErrorCode.LESSON_GENERATION_IN_PROGRESS,
      message,
    );
}

/** URLs referenced by the asset lists of a structured content. */
export function lessonContentAssetUrls(content: LessonJsonObject): string[] {
  const urls: string[] = [];
  for (const key of LESSON_ASSET_LIST_KEYS) {
    const items = Array.isArray(content[key]) ? content[key] : [];
    for (const item of items) {
      const url = lessonAsObject(item).url;
      if (typeof url === "string" && url.trim()) urls.push(url);
    }
  }
  return urls;
}

/**
 * Text safe to persist and show for a failed publication: client errors and
 * item-PDF failures keep their own message, everything else becomes generic.
 */
export function publicPublicationFailureMessage(error: unknown): string {
  const isPublic =
    error instanceof HttpException &&
    (error.getStatus() < 500 ||
      (error instanceof AppException &&
        error.getCode() === ErrorCode.LESSON_STAGE_PDF_UNAVAILABLE));
  const message = isPublic
    ? error.message
    : LESSON_PUBLICATION.GENERIC_FAILURE_MESSAGE;
  return message.slice(0, LESSON_PUBLICATION.FAILURE_MESSAGE_MAX_LENGTH);
}

/**
 * Failure to produce the PDF of one item, always naming the item. Content
 * problems (4xx from the renderer) answer 422 with their own message; an
 * unavailable or busy converter answers 503.
 */
export function stagePdfUnavailable(
  type: LessonStageType,
  error: unknown,
): AppException {
  const item = LESSON_STAGE_ITEM_NAMES[type];
  if (error instanceof HttpException) {
    const contentProblem = error.getStatus() < 500;
    const serviceUnavailable =
      error.getStatus() === Number(HttpStatus.SERVICE_UNAVAILABLE);
    if (contentProblem || serviceUnavailable)
      return new AppException(
        ErrorCode.LESSON_STAGE_PDF_UNAVAILABLE,
        `${item}: ${error.message}`,
        contentProblem
          ? HttpStatus.UNPROCESSABLE_ENTITY
          : HttpStatus.SERVICE_UNAVAILABLE,
      );
  }
  return new AppException(
    ErrorCode.LESSON_STAGE_PDF_UNAVAILABLE,
    `${item}: ${LESSON_STAGE_PDF.UNAVAILABLE_MESSAGE}`,
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

/** True once any item was submitted to, approved by or returned from the reviewer. */
export function isLessonInReviewCycle(
  statuses: ReadonlyArray<LessonStageStatus | undefined>,
): boolean {
  return statuses.some(
    (status) =>
      status !== undefined &&
      LESSON_REVIEW_CYCLE_STAGE_STATUSES.includes(status),
  );
}

/** Título da página de material de visita em que a lição é publicada. */
export function lessonPublicationTitle(
  lesson: Pick<LessonEntity, "category" | "weekNumber" | "theme">,
): string {
  const label = lessonCategoryProfile(lesson.category).label;
  return lesson.weekNumber
    ? `Semana ${lesson.weekNumber} · ${label} — ${lesson.theme}`
    : `${label} — ${lesson.theme}`;
}

export function lessonPublicationDescription(
  lesson: Pick<LessonEntity, "category" | "weekNumber">,
): string {
  const profile = lessonCategoryProfile(lesson.category);
  return `Material completo para ${profile.audience}${lesson.weekNumber ? ` — semana ${lesson.weekNumber}` : ""}, revisado e aprovado.`;
}

/**
 * Texto de que sai o caminho da rota da página publicada: semana e público,
 * para que Crianças e Adultos da mesma semana não colidam.
 */
export function lessonPublicationRoutePathSource(
  lesson: Pick<LessonEntity, "category" | "weekNumber">,
): string | undefined {
  return lesson.weekNumber
    ? `Semana ${lesson.weekNumber} ${lessonCategoryProfile(lesson.category).label}`
    : undefined;
}

export function lessonPdfFileName(
  lesson: Pick<LessonEntity, "category" | "weekNumber">,
  prefix = "",
): string {
  const slug = lessonCategoryProfile(lesson.category).slug;
  return `${prefix}${prefix ? "" : "licao-"}${slug}${lesson.weekNumber ? `-semana-${lesson.weekNumber}` : ""}.pdf`;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Runs async work over items with bounded parallelism; never rejects. */
export async function settleWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  work: (item: T) => Promise<void>,
  onError: (item: T, error: unknown) => void,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, queue.length)) },
    async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        try {
          await work(item);
        } catch (error: unknown) {
          onError(item, error);
        }
      }
    },
  );
  await Promise.all(runners);
}
