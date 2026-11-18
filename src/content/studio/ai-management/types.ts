import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";

export interface AiConfiguredModel {
  readonly id: string;
  readonly capabilities: readonly AiGenerationCapability[];
}

