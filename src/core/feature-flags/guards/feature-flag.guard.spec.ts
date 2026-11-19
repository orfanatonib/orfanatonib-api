import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { AccessDeniedException } from "src/common/exceptions";

import { AuthContextService } from "src/core/auth/services/auth-context.service";

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
  const authContext = { getRole: jest.fn() };

  let guard: FeatureFlagGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeatureFlagGuard,
        { provide: Reflector, useValue: reflector },
        { provide: GetFeatureFlagsService, useValue: featureFlags },
        { provide: ConfigService, useValue: configService },
        { provide: AuthContextService, useValue: authContext },
      ],
    }).compile();

    guard = moduleRef.get(FeatureFlagGuard);

    reflector.getAllAndOverride.mockReturnValue("shelter-pagelas");
    featureFlags.isEnabled.mockResolvedValue(true);
    featureFlags.isEnabledForRole.mockResolvedValue(true);
    configService.get.mockReturnValue("local");
    authContext.getRole.mockResolvedValue(null);
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

  describe("{ anyOf } (leitura compartilhada)", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue({ anyOf: ["a", "b"] });
    });

    it("passa quando só uma das flags está ligada para o ator", async () => {
      featureFlags.isEnabledForRole.mockImplementation((key: string) =>
        Promise.resolve(key === "b"),
      );
      await expect(guard.canActivate(contextFor("member"))).resolves.toBe(true);
    });

    it("bloqueia quando nenhuma está ligada", async () => {
      featureFlags.isEnabledForRole.mockResolvedValue(false);
      await expect(guard.canActivate(contextFor("member"))).rejects.toThrow(
        AccessDeniedException,
      );
    });
  });

  it("array exige TODAS as flags", async () => {
    reflector.getAllAndOverride.mockReturnValue(["a", "b"]);
    featureFlags.isEnabledForRole.mockImplementation((key: string) =>
      Promise.resolve(key === "a"),
    );
    await expect(guard.canActivate(contextFor("admin"))).rejects.toThrow(
      AccessDeniedException,
    );
  });

  it("o 403 traz details.code FEATURE_DISABLED", async () => {
    featureFlags.isEnabledForRole.mockResolvedValue(false);
    const error = await guard
      .canActivate(contextFor("member"))
      .catch((e: AccessDeniedException) => e);
    expect(error).toBeInstanceOf(AccessDeniedException);
    expect(
      JSON.stringify((error as AccessDeniedException).getResponse()),
    ).toContain("FEATURE_DISABLED");
  });

  it("sem request.user (rota pública ou guard antes do JWT) o perfil vem do token", async () => {
    authContext.getRole.mockResolvedValue("member");
    await guard.canActivate(contextFor());
    expect(featureFlags.isEnabledForRole).toHaveBeenCalledWith(
      "shelter-pagelas",
      "member",
    );
  });
});
