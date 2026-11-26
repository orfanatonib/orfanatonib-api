export enum AiProviderErrorKind {
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
  AUTHENTICATION = "AUTHENTICATION",
  QUOTA = "QUOTA",
  SAFETY = "SAFETY",
  SCHEMA = "SCHEMA",
  CANCELLED = "CANCELLED",
  /** Falha de rede antes de haver resposta (DNS, conexão recusada): vale tentar de novo. */
  NETWORK = "NETWORK",
  /** O modelo pedido não existe ou a conta não tem acesso a ele. */
  NOT_FOUND_MODEL = "NOT_FOUND_MODEL",
  /** O pedido não cabe na janela de contexto do modelo. */
  CONTEXT_LENGTH = "CONTEXT_LENGTH",
  /** O provedor recusou o pedido por parâmetros inválidos (4xx que não é nenhum dos acima). */
  INVALID_REQUEST = "INVALID_REQUEST",
  /** A resposta foi cortada pelo limite de tokens de saída (o raciocínio do modelo conta nele). */
  OUTPUT_TRUNCATED = "OUTPUT_TRUNCATED",
  UNKNOWN = "UNKNOWN",
}
