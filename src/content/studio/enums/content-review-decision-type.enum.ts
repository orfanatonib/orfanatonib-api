/**
 * Linha do tempo de revisão de um item: o envio (e cada reenvio) para a revisão, e as decisões do revisor.
 * Em `SUBMITTED`, `reviewerId` guarda quem enviou.
 */
export enum ContentReviewDecisionType {
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
}
