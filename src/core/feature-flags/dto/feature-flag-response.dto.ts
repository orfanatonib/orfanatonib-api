import { UserRole } from "src/core/auth/auth.types";

import { FeatureFlagAudience } from "../types";

export class FeatureFlagResponseDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  environment: string | null;
  targetRoles: UserRole[];
  audience: FeatureFlagAudience;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
