/** Ciclo de moderação: todo comentário nasce PENDING; só APPROVED aparece para todos. */
export enum FeedCommentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}
