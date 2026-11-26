import {
  INBOX_DEDUPE_KEY_MAX_LENGTH,
  INBOX_LABEL_MAX_LENGTH,
  INBOX_REVISION_EMPTY,
  INBOX_REVISION_SEPARATOR,
} from "../constants/inbox-notification.constants";
import {
  INBOX_SOURCE_LABELS,
  INBOX_TYPE_TITLES,
} from "../constants/inbox-notification-texts.constants";
import { InboxNoticeInput, InboxNoticeRow, InboxSummaryData } from "../types";

/** Corta sem estourar a coluna e sem deixar quebra de linha no meio do aviso. */
export function clampLabel(label: string): string {
  const clean = label.replace(/\s+/g, " ").trim();
  return clean.length > INBOX_LABEL_MAX_LENGTH
    ? `${clean.slice(0, INBOX_LABEL_MAX_LENGTH - 1)}…`
    : clean;
}

export function buildNoticeTitle(input: InboxNoticeInput): string {
  return INBOX_TYPE_TITLES[input.type];
}

export function buildNoticePreview(input: InboxNoticeInput): string {
  const label = clampLabel(input.label);
  const source = INBOX_SOURCE_LABELS[input.source];
  return label ? `${source} · ${label}` : source;
}

/** Um aviso por destinatário; destinatários repetidos viram um só. */
export function buildNoticeRows(
  input: InboxNoticeInput,
  recipientIds: readonly string[],
): InboxNoticeRow[] {
  return [...new Set(recipientIds)].map((recipientId) => ({
    recipientId,
    source: input.source,
    type: input.type,
    title: buildNoticeTitle(input),
    preview: buildNoticePreview(input),
    targetKind: input.targetKind,
    targetId: input.targetId,
    targetAudience: input.targetAudience ?? null,
    targetStage: input.targetStage ?? null,
    actorId: input.actorId ?? null,
    dedupeKey: input.dedupeKey.slice(0, INBOX_DEDUPE_KEY_MAX_LENGTH),
  }));
}

/** Chave opaca que muda em criação, leitura e exclusão: o front só recarrega a lista quando ela muda. */
export function buildRevision(summary: InboxSummaryData): string {
  return [
    summary.total,
    summary.unreadCount,
    summary.lastChangedAt?.toISOString() ?? INBOX_REVISION_EMPTY,
  ].join(INBOX_REVISION_SEPARATOR);
}
