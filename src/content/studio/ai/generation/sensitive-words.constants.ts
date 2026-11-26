/**
 * Palavras sensíveis do texto APRESENTADO ao público. O ministério atende abrigos, casas de apoio e pessoas em
 * situação de vulnerabilidade: palavras que podem reabrir feridas (família ausente, abandono, fome, violência) não
 * entram no que é lido ou mostrado. O material do voluntário (personagens, materiais de apoio, objetivos da visita)
 * não é apresentado ao público e pode usá-las.
 *
 * Os padrões rodam sobre o texto em minúsculas, com acentos (país ≠ pais).
 */
export interface SensitiveWord {
  /** Como a palavra aparece nas mensagens e no prompt. */
  readonly label: string;
  readonly pattern: RegExp;
  /** Sugestão de como contar sem ela. */
  readonly instead: string;
}

export const SENSITIVE_WORDS: readonly SensitiveWord[] = [
  {
    label: "pai / pais",
    pattern: /(?<!\p{L})(pai|pais|papai|painho)(?!\p{L})/u,
    instead:
      'diga "Deus", "o Senhor" ou "o Criador" (nunca "Pai" como título); para pessoas da história use o nome ou "a família"',
  },
  {
    label: "mãe / mães",
    pattern: /(?<!\p{L})(mãe|mães|mamãe|mainha)(?!\p{L})/u,
    instead: 'use o nome da pessoa ou "a mulher", "a esposa de …"',
  },
  {
    label: "abandono / abandonar",
    pattern: /(?<!\p{L})abandon\p{L}*/u,
    instead: 'use "deixar", "afastar-se" ou "ficar longe"',
  },
  {
    label: "fome / faminto",
    pattern: /(?<!\p{L})(fome|famint\p{L}*)(?!\p{L})/u,
    instead: 'use "precisar de alimento" ou conte sem citar a falta',
  },
  {
    label: "órfão / orfandade",
    pattern: /(?<!\p{L})(órfã|órfão|órfãos|órfãs|orfandade)(?!\p{L})/u,
    instead: 'use "crianças" ou "pessoas"',
  },
  {
    label: "abuso / maus-tratos",
    pattern: /(?<!\p{L})(abus\p{L}*|maus[- ]tratos?)(?!\p{L})/u,
    instead: "conte sem detalhar; foque no cuidado de Deus",
  },
  {
    label: "rejeição / desamparo",
    pattern: /(?<!\p{L})(rejeit\p{L}*|desampar\p{L}*)(?!\p{L})/u,
    instead: 'use "ficar de fora" ou "precisar de ajuda"',
  },
];

/** Palavras sensíveis (rótulos, sem repetição) encontradas em um texto. */
export function findSensitiveWords(text: string): string[] {
  // Sem remover acentos: "país" (nação) não é "pais" (pai e mãe).
  const lower = text.toLowerCase();
  return SENSITIVE_WORDS.filter((word) => word.pattern.test(lower)).map(
    (word) => word.label,
  );
}

/** Bloco do prompt: o que evitar e como contar sem. */
export function sensitiveWordsPrompt(): string[] {
  return [
    "PALAVRAS SENSÍVEIS (o público inclui pessoas em abrigos e casas de apoio)",
    "- No texto que será LIDO ou MOSTRADO ao público (título, quebra-gelo, história, aplicação e apelo, perguntas e respostas, versículos, falas e passos de atividades) NUNCA use estas palavras ou variações, nem dentro de falas:",
    ...SENSITIVE_WORDS.map((w) => `  • ${w.label}: ${w.instead}.`),
    '- Reconte o fato sem a palavra (em vez de "o pai de Sansão", "Manoá"; em vez de "Pai nosso", "nosso Deus"). Versículos que contenham essas palavras (como "Pai" em João 14.6) não servem: escolha outro que expresse a mesma verdade.',
    "- Isto vale só para o texto apresentado: personagens, materiais de apoio, locais e objetivos da visita (leitura do voluntário) podem usar a palavra quando for o nome do papel.",
  ];
}
