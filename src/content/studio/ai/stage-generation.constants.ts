/** Esquema genérico da saída de uma etapa (o conteúdo específico por tipo evolui com o catálogo). */
export const STAGE_OUTPUT_SCHEMA: Readonly<Record<string, unknown>> = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: { heading: { type: "string" }, body: { type: "string" } },
      },
    },
  },
};

export const GENERATION_LEASE_MS = 5 * 60_000;
export const GENERATION_WORKER_PREFIX = "gen-worker";

/**
 * Teto de tokens de saída de uma etapa. Modelos com raciocínio gastam boa parte dele pensando (uma lição de
 * bebê usou ~3,3 mil, 2,5 mil só de raciocínio); com o padrão de 4 mil a resposta era cortada e a geração falhava.
 */
export const STAGE_MAX_OUTPUT_TOKENS = 16_000;
