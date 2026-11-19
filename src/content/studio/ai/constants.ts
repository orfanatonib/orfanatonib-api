import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";

export const RETRYABLE_AI_PROVIDER_ERRORS: readonly AiProviderErrorKind[] = [
  AiProviderErrorKind.TIMEOUT,
  AiProviderErrorKind.RATE_LIMIT,
  AiProviderErrorKind.SERVER,
  AiProviderErrorKind.NETWORK,
];

export const CONTENT_STUDIO_SENSITIVE_INSTRUCTION_PATTERNS: readonly RegExp[] =
  [
    /\bnome(?:s)?\s+(?:do|da|dos|das)\s+acolhid/iu,
    /\bcpf\b/iu,
    /\brg\b/iu,
    /\bdiagn[oó]stic/iu,
    /\bprontu[aá]ri/iu,
    /\bhist[oó]ric[oa]\s+(?:familiar|de\s+trauma|de\s+abuso)/iu,
    /\bsitua[cç][aã]o\s+(?:jur[ií]dica|processual)/iu,
    /\bendere[cç]o\s+(?:do|da)\s+abrigo/iu,
    /\blocaliza[cç][aã]o\s+exata/iu,
    /\brosto\s+(?:real|da\s+crian[cç]a|do\s+acolhido)/iu,
    /\b(?:nome|telefone|e-?mail|endereço|documento)\s+(?:da|do|de)\s+(?:criança|adolescente|acolhid[oa]|beneficiário)/iu,
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/u,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
    // Telefone BR: DDD + número com separador, celular com hífen, ou 10–11 dígitos seguidos.
    // (O padrão antigo casava qualquer sequência de 8 dígitos: versículos, anos, códigos.)
    /(?:\+?55[\s.-]?)?(?:\(\d{2}\)|\b\d{2})[\s.-]?9?\d{4}[\s.-]\d{4}\b|\b9\d{4}-\d{4}\b|\b\d{2}9?\d{8}\b/u,
  ];

export const REDACTED_AI_ERROR_MESSAGE =
  "O provedor de IA não conseguiu concluir a operação.";
