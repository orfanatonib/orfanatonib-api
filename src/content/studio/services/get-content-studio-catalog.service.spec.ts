import { Test, TestingModule } from "@nestjs/testing";

import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";

import { GetContentStudioCatalogService } from "./get-content-studio-catalog.service";
import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";

describe("GetContentStudioCatalogService", () => {
  let service: GetContentStudioCatalogService;
  let featureFlags: jest.Mocked<GetFeatureFlagsService>;

  beforeEach(async () => {
    const mockFeatureFlags = {
      isEnabled: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetContentStudioCatalogService,
        {
          provide: GetFeatureFlagsService,
          useValue: mockFeatureFlags,
        },
      ],
    }).compile();

    service = module.get<GetContentStudioCatalogService>(
      GetContentStudioCatalogService,
    );
    featureFlags = module.get(GetFeatureFlagsService);
  });

  it("should return the default catalog definition and capability flags", async () => {
    const result = await service.execute();

    expect(result).toBeDefined();
    expect(result.version).toBe(CONTENT_STUDIO_CATALOG_VERSION);
    expect(result.allAudiencesRequired).toBe(false);
    expect(result.audiences.length).toBe(4);
    expect(result.capabilities).toEqual({
      generation: false,
      review: false,
      publication: false,
      providerAdministration: false,
    });
    expect(featureFlags.isEnabled).toHaveBeenCalledTimes(4);
  });
  it("exposes generation when its feature flag is enabled", async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    expect((await service.execute()).capabilities.generation).toBe(true);
  });
});
