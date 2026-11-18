import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { AccessDeniedException } from "src/common/exceptions";

import { FeatureFlagGuard } from "./feature-flag.guard";
import { GetFeatureFlagsService } from "../services/get-feature-flags.service";

const contextFor = (role?: string) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  }) as unknown as ExecutionContext;
const context = contextFor();

describe("FeatureFlagGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const featureFlags = { isEnabled: jest.fn(), isEnabledForRole: jest.fn() };
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

    reflector.getAllAndOverride.mockReturnValue("shelter-pagelas");
    featureFlags.isEnabled.mockResolvedValue(true);
    featureFlags.isEnabledForRole.mockResolvedValue(true);
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
    reflector.getAllAndOverride.mockReturnValue(undefined);

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

  it("respeita a audiência por papel: ligada para líder, bloqueada para membro", async () => {
    featureFlags.isEnabledForRole.mockImplementation(
      (_key: string, role: string | null) => Promise.resolve(role === "leader"),
    );

    await expect(guard.canActivate(contextFor("leader"))).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor("member")),
    ).rejects.toBeInstanceOf(AccessDeniedException);
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
    expect(featureFlags.isEnabledForRole).toHaveBeenCalledWith(
      "shelter-pagelas",
      null,
    );
  });

  it("lê o decorator também da classe (método vence)", async () => {
    await guard.canActivate(context);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      expect.any(String),
      [expect.any(Function), expect.any(Function)],
    );
  });
});
