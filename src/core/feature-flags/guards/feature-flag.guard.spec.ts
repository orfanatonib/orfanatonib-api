import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { AccessDeniedException } from "src/common/exceptions";

import { FeatureFlagGuard } from "./feature-flag.guard";
import { GetFeatureFlagsService } from "../services/get-feature-flags.service";

const context = {
  getHandler: () => () => undefined,
} as unknown as ExecutionContext;

describe("FeatureFlagGuard", () => {
  const reflector = { get: jest.fn() };
  const featureFlags = { isEnabled: jest.fn() };
  const configService = { get: jest.fn() };

  let guard: FeatureFlagGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeatureFlagGuard,
        { provide: Reflector, useValue: reflector },
        { provide: GetFeatureFlagsService, useValue: featureFlags },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    guard = moduleRef.get(FeatureFlagGuard);

    reflector.get.mockReturnValue("shelter-pagelas");
    featureFlags.isEnabled.mockResolvedValue(true);
    configService.get.mockReturnValue("local");
  });

  it("libera a rota quando a flag está ligada", async () => {
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(featureFlags.isEnabled).toHaveBeenCalledWith(
      "shelter-pagelas",
      "local",
    );
  });

  it("libera a rota que não declara flag nenhuma", async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(featureFlags.isEnabled).not.toHaveBeenCalled();
  });

  it("bloqueia quando a flag está desligada, nomeando a funcionalidade", async () => {
    featureFlags.isEnabled.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new AccessDeniedException(
        'A funcionalidade "shelter-pagelas" está temporariamente indisponível',
      ),
    );
  });

  it("consulta sem ambiente quando ele não está configurado", async () => {
    configService.get.mockReturnValue(undefined);

    await guard.canActivate(context);

    expect(featureFlags.isEnabled).toHaveBeenCalledWith(
      "shelter-pagelas",
      undefined,
    );
  });
});
