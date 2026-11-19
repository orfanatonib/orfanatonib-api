import { AiGenerationCapability } from "../../ai/enums/ai-generation-capability.enum";
import type { AiConfiguredModel } from "../types";

export function parseEnabledConfig(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parseModelAllowlist(
  textModels: string | undefined,
  imageModels: string | undefined,
): AiConfiguredModel[] {
  const models = new Map<string, Set<AiGenerationCapability>>();

  addModels(models, textModels, AiGenerationCapability.TEXT_STRUCTURED);
  addModels(models, imageModels, AiGenerationCapability.IMAGE_GENERATION);

  return [...models.entries()].map(([id, capabilities]) => ({
    id,
    capabilities: [...capabilities],
  }));
}

function addModels(
  target: Map<string, Set<AiGenerationCapability>>,
  rawModels: string | undefined,
  capability: AiGenerationCapability,
): void {
  for (const model of rawModels?.split(",") ?? []) {
    const normalized = model.trim();
    if (!normalized) continue;
    const capabilities =
      target.get(normalized) ?? new Set<AiGenerationCapability>();
    capabilities.add(capability);
    target.set(normalized, capabilities);
  }
}
