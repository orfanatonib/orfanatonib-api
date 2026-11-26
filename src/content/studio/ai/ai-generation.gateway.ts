import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import {
  AiModelDescriptor,
  AiProviderHealthResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  StructuredTextGenerationRequest,
  StructuredTextGenerationResult,
} from "./types";

export abstract class AiGenerationGateway {
  abstract generateStructuredText(
    request: StructuredTextGenerationRequest,
  ): Promise<StructuredTextGenerationResult>;

  abstract generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult>;

  abstract listModels(
    capability: AiGenerationCapability,
  ): Promise<readonly AiModelDescriptor[]>;

  abstract healthCheck(): Promise<AiProviderHealthResult>;
}
