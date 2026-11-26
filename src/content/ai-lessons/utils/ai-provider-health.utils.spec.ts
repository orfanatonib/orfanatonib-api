import { AiProviderHealthStatus } from "../dto/ai-provider-health-response.dto";
import { AiModelCatalogSource } from "../constants/ai-provider-settings.constants";
import {
  buildProviderHealth,
  missingSavedModels,
} from "./ai-provider-health.utils";

const live = (general: string[], image: string[]) => ({
  models: { general, image },
  source: AiModelCatalogSource.LIVE,
  isLive: true,
  warning: null,
});
const input = (
  over: Partial<Parameters<typeof buildProviderHealth>[0]> = {},
) => ({
  provider: "openai" as const,
  label: "OpenAI",
  key: { apiKey: "k" },
  saved: { generalModel: "g1", imageModel: "i1" },
  catalog: live(["g1"], ["i1"]),
  checkedAt: new Date("2026-01-01T00:00:00Z"),
  durationMs: 12,
  ...over,
});

describe("buildProviderHealth", () => {
  it("OK com chave aceita e modelos presentes", () => {
    expect(buildProviderHealth(input())).toMatchObject({
      ok: true,
      status: AiProviderHealthStatus.OK,
      durationMs: 12,
      checkedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  it("sem chave e chave ilegível não chamam o provedor (status próprio)", () => {
    expect(buildProviderHealth(input({ key: { apiKey: "" } })).status).toBe(
      AiProviderHealthStatus.NO_KEY,
    );
    expect(
      buildProviderHealth(
        input({ key: { apiKey: "", apiKeyUnreadable: true } }),
      ).status,
    ).toBe(AiProviderHealthStatus.UNREADABLE_KEY);
  });
  it("lista de contingência vira FAILED com o motivo do provedor", () => {
    const result = buildProviderHealth(
      input({
        catalog: {
          models: { general: [], image: [] },
          source: AiModelCatalogSource.FALLBACK,
          isLive: false,
          warning: "OpenAI recusou a chave salva.",
        },
      }),
    );
    expect(result).toMatchObject({
      ok: false,
      status: AiProviderHealthStatus.FAILED,
      message: "OpenAI recusou a chave salva.",
    });
  });
  it("modelo salvo ausente da lista ao vivo", () => {
    const result = buildProviderHealth(
      input({ catalog: live(["outro"], ["i1"]) }),
    );
    expect(result).toMatchObject({
      ok: false,
      status: AiProviderHealthStatus.MODEL_MISSING,
      missingModels: ["g1"],
    });
    expect(
      missingSavedModels(
        { generalModel: "", imageModel: "" },
        { general: [], image: [] },
      ),
    ).toEqual([]);
  });
  it("nunca devolve a chave", () => {
    expect(
      JSON.stringify(
        buildProviderHealth(input({ key: { apiKey: "segredo-123" } })),
      ),
    ).not.toContain("segredo-123");
  });
});
