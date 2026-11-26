import { SetMetadata } from "@nestjs/common";

export const FEATURE_FLAG_KEY = "feature_flag";

/** Liga o recurso quando **qualquer** uma das flags estiver ligada para o ator. */
export interface FeatureFlagAnyOf {
  readonly anyOf: readonly string[];
}

/**
 * - `"chave"`: uma flag;
 * - `["a", "b"]`: **todas** precisam estar ligadas;
 * - `{ anyOf: ["a", "b"] }`: **qualquer uma** basta (leitura compartilhada).
 */
export type FeatureFlagMetadata = string | readonly string[] | FeatureFlagAnyOf;

export const isFeatureFlagAnyOf = (
  metadata: FeatureFlagMetadata,
): metadata is FeatureFlagAnyOf =>
  typeof metadata === "object" && !Array.isArray(metadata);

export const FeatureFlag = (key: FeatureFlagMetadata) =>
  SetMetadata(FEATURE_FLAG_KEY, key);
