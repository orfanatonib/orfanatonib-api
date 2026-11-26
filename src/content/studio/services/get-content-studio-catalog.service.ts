import { Injectable } from "@nestjs/common";

import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

import {
  CONTENT_AUDIENCE_CATALOG,
  CONTENT_STUDIO_CATALOG_VERSION,
} from "../constants";
import { ContentStudioCatalogResponseDto } from "../dto/content-studio-catalog-response.dto";

@Injectable()
export class GetContentStudioCatalogService {
  constructor(private readonly featureFlags: GetFeatureFlagsService) {}

  async execute(): Promise<ContentStudioCatalogResponseDto> {
    const [generation, review, publication, providerAdministration] =
      await Promise.all([
        this.featureFlags.isEnabled(FeatureFlagKeys.CONTENT_STUDIO_GENERATION),
        this.featureFlags.isEnabled(FeatureFlagKeys.CONTENT_STUDIO_REVIEW),
        this.featureFlags.isEnabled(FeatureFlagKeys.CONTENT_STUDIO_PUBLICATION),
        this.featureFlags.isEnabled(
          FeatureFlagKeys.CONTENT_STUDIO_PROVIDER_ADMIN,
        ),
      ]);

    return {
      version: CONTENT_STUDIO_CATALOG_VERSION,
      allAudiencesRequired: false,
      audiences: CONTENT_AUDIENCE_CATALOG.map((definition) => ({
        ...definition,
        stages: definition.stages.map((stage) => ({
          ...stage,
          dependencies: [...stage.dependencies],
        })),
      })),
      capabilities: {
        generation,
        review,
        publication,
        providerAdministration,
      },
    };
  }
}
