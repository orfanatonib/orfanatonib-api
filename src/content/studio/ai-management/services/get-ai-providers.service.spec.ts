import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { GetAiProvidersService } from "./get-ai-providers.service";

describe("GetAiProvidersService", () => {
  let service: GetAiProvidersService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAiProvidersService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GetAiProvidersService>(GetAiProvidersService);
  });

  it("should return the baseline list of AI providers with security settings", () => {
    const providers = service.execute();

    expect(providers).toHaveLength(2);
    expect(providers[0].provider).toBe("OPENAI");
    expect(providers[0].enabled).toBe(false);
    expect(providers[1].provider).toBe("GEMINI");
    expect(providers[1].enabled).toBe(false);
  });
});
