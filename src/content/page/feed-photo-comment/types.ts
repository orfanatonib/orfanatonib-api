export interface FeedCommentActor {
  userId: string;
  isAdmin: boolean;
}

/** Decisão do moderador sobre um comentário pendente. */
export interface FeedCommentDecision {
  moderatorId: string;
  reason: string | null;
}
