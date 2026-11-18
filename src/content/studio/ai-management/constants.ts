import { AiProvider } from "../ai/enums/ai-provider.enum";

export const AI_PROVIDER_CONFIG_KEYS: Readonly<
  Record<
    AiProvider,
    {
      readonly enabled: string;
      readonly credential: string;
      readonly textModels: string;
      readonly imageModels: string;
    }
  >
> = {
  [AiProvider.OPENAI]: {
    enabled: "CONTENT_STUDIO_OPENAI_ENABLED",
    credential: "CONTENT_STUDIO_OPENAI_API_KEY",
    textModels: "CONTENT_STUDIO_OPENAI_TEXT_MODELS",
    imageModels: "CONTENT_STUDIO_OPENAI_IMAGE_MODELS",
  },
  [AiProvider.GEMINI]: {
    enabled: "CONTENT_STUDIO_GEMINI_ENABLED",
    credential: "CONTENT_STUDIO_GEMINI_API_KEY",
    textModels: "CONTENT_STUDIO_GEMINI_TEXT_MODELS",
    imageModels: "CONTENT_STUDIO_GEMINI_IMAGE_MODELS",
  },
};

export const AI_PROVIDERS: readonly AiProvider[] = Object.values(AiProvider);

