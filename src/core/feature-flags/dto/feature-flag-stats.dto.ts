import { FeatureFlagAudience } from "../types";

export class FeatureFlagStatsDto {
  total: number;
  enabled: number;
  disabled: number;
  byAudience: Record<FeatureFlagAudience, number>;
}
