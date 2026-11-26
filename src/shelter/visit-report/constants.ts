/** Contagens são `int` no banco e pessoas de verdade: inteiros de 0 a um teto realista (acima disso o banco estoura). */
export const VISIT_REPORT_LIMITS = {
  countMax: 100000,
  observationMax: 10000,
} as const;
