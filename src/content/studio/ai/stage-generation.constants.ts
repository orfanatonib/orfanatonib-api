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
