import { SetMetadata } from "@nestjs/common";

export const FEATURE_FLAG_KEY = "feature_flag";

export type FeatureFlagMetadata = string | readonly string[];

export const FeatureFlag = (key: FeatureFlagMetadata) =>
  SetMetadata(FEATURE_FLAG_KEY, key);
