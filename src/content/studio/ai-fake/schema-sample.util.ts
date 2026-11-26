/** Gera um valor determinístico que satisfaz um JSON Schema simples (para o gateway fake). */
export function sampleFromSchema(schema: unknown, depth = 0): unknown {
  if (depth > 6 || typeof schema !== "object" || schema === null) return null;
  const s = schema as Record<string, unknown>;
  if (Array.isArray(s.enum) && s.enum.length > 0)
    return (s.enum as unknown[])[0];
  const type: unknown = Array.isArray(s.type)
    ? (s.type as unknown[])[0]
    : s.type;
  switch (type) {
    case "string":
      return "texto simulado";
    case "integer":
    case "number":
      return typeof s.minimum === "number" ? s.minimum : 1;
    case "boolean":
      return true;
    case "array": {
      const min = typeof s.minItems === "number" ? Math.max(1, s.minItems) : 1;
      return Array.from({ length: min }, () =>
        sampleFromSchema(s.items, depth + 1),
      );
    }
    case "object": {
      const props = (s.properties ?? {}) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(props).map(([key, value]) => [
          key,
          sampleFromSchema(value, depth + 1),
        ]),
      );
    }
    default:
      return null;
  }
}
