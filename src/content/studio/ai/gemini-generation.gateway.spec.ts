import { ConfigService } from "@nestjs/config";

import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { GeminiGenerationGateway } from "./gemini-generation.gateway";
import { AiProviderRequestError } from "./openai-generation.gateway";

const env: Record<string, string> = {
  CONTENT_STUDIO_GEMINI_ENABLED: "true",
  CONTENT_STUDIO_GEMINI_API_KEY: "k-secret",
  CONTENT_STUDIO_GEMINI_TEXT_MODELS: "gemini-test",
};
const config = (over: Record<string, string> = {}) =>
  ({
    get: (k: string) => ({ ...env, ...over })[k],
  }) as unknown as ConfigService;
const req = {
  correlationId: "c",
  instructions: ["escreva"],
  input: { stageType: "SCRIPT" },
  outputSchema: { type: "object" },
};
const ok = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
const kind = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof AiProviderRequestError ? e.kind : "other";
  }
};

describe("GeminiGenerationGateway", () => {
  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch");
  });
  afterEach(() => fetchSpy.mockRestore());

  it("gera JSON estruturado, envia a chave só no header e devolve o uso de tokens", async () => {
    fetchSpy.mockReturnValue(
      ok({
        candidates: [{ content: { parts: [{ text: '{"title":"A"}' }] } }],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 7,
          totalTokenCount: 12,
        },
      }),
    );
    const out = await new GeminiGenerationGateway(
      config(),
    ).generateStructuredText(req);
    expect(out).toMatchObject({
      provider: "GEMINI",
      model: "gemini-test",
      output: { title: "A" },
      usage: { totalTokens: 12 },
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/models/gemini-test:generateContent");
    expect(url).not.toContain("k-secret");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "k-secret",
    );
    const sent = JSON.parse(init.body as string) as {
      generationConfig: { responseMimeType: string };
    };
    expect(sent.generationConfig.responseMimeType).toBe("application/json");
  });

  it.each([
    [
      429,
      {
        error: {
          status: "RESOURCE_EXHAUSTED",
          message: "Quota exceeded for quota metric",
        },
      },
      AiProviderErrorKind.QUOTA,
    ],
    [
      429,
      {
        error: {
          status: "RESOURCE_EXHAUSTED",
          message: "too many requests per minute",
        },
      },
      AiProviderErrorKind.RATE_LIMIT,
    ],
    [401, {}, AiProviderErrorKind.AUTHENTICATION],
    [503, {}, AiProviderErrorKind.SERVER],
    [400, {}, AiProviderErrorKind.INVALID_REQUEST],
  ])("HTTP %s classifica como %s", async (status, body, expected) => {
    fetchSpy.mockReturnValue(ok(body, status));
    expect(
      await kind(
        new GeminiGenerationGateway(config()).generateStructuredText(req),
      ),
    ).toBe(expected);
  });

  it("bloqueio de segurança, saída vazia ou inválida", async () => {
    const g = new GeminiGenerationGateway(config());
    fetchSpy.mockReturnValueOnce(
      ok({ promptFeedback: { blockReason: "SAFETY" } }),
    );
    expect(await kind(g.generateStructuredText(req))).toBe(
      AiProviderErrorKind.SAFETY,
    );
    fetchSpy.mockReturnValueOnce(
      ok({ candidates: [{ finishReason: "SAFETY" }] }),
    );
    expect(await kind(g.generateStructuredText(req))).toBe(
      AiProviderErrorKind.SAFETY,
    );
    fetchSpy.mockReturnValueOnce(ok({ candidates: [] }));
    expect(await kind(g.generateStructuredText(req))).toBe(
      AiProviderErrorKind.SCHEMA,
    );
    fetchSpy.mockReturnValueOnce(
      ok({ candidates: [{ content: { parts: [{ text: "não é json" }] } }] }),
    );
    expect(await kind(g.generateStructuredText(req))).toBe(
      AiProviderErrorKind.SCHEMA,
    );
  });

  it("sem chave/desligado/modelo: AUTHENTICATION sem chamar a rede; falha de rede vira NETWORK", async () => {
    expect(
      await kind(
        new GeminiGenerationGateway(
          config({ CONTENT_STUDIO_GEMINI_API_KEY: "" }),
        ).generateStructuredText(req),
      ),
    ).toBe(AiProviderErrorKind.AUTHENTICATION);
    expect(
      await kind(
        new GeminiGenerationGateway(
          config({ CONTENT_STUDIO_GEMINI_ENABLED: "false" }),
        ).generateStructuredText(req),
      ),
    ).toBe(AiProviderErrorKind.AUTHENTICATION);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRejectedValue(new Error("ECONNRESET"));
    expect(
      await kind(
        new GeminiGenerationGateway(config()).generateStructuredText(req),
      ),
    ).toBe(AiProviderErrorKind.NETWORK);
  });

  it("imagem: sem modelo de imagem configurado falha antes da rede", async () => {
    const g = new GeminiGenerationGateway(config());
    expect(
      await kind(
        g.generateImage({ correlationId: "c", instructions: [], input: {} }),
      ),
    ).toBe(AiProviderErrorKind.AUTHENTICATION);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("imagem", () => {
    const imageConfig = () =>
      config({ CONTENT_STUDIO_GEMINI_IMAGE_MODELS: "gemini-img" });
    const imageReq = {
      correlationId: "c",
      instructions: ["desenhe"],
      input: { scene: "campo" },
      size: "1536x1024",
    };

    it("pede só imagem, na proporção do pedido, e devolve os bytes", async () => {
      fetchSpy.mockReturnValue(
        ok({
          candidates: [
            {
              content: {
                parts: [
                  { text: "ok" },
                  { inlineData: { mimeType: "image/png", data: "iVBORw0=" } },
                ],
              },
            },
          ],
        }),
      );
      const result = await new GeminiGenerationGateway(
        imageConfig(),
      ).generateImage(imageReq);
      expect(result.mediaType).toBe("image/png");
      expect(result.model).toBe("gemini-img");
      expect(result.bytes.byteLength).toBeGreaterThan(0);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/models/gemini-img:generateContent");
      expect(url).not.toContain("k-secret");
      const body = JSON.parse(init.body as string) as {
        generationConfig: {
          responseModalities: string[];
          imageConfig: { aspectRatio: string };
        };
      };
      expect(body.generationConfig.responseModalities).toEqual(["IMAGE"]);
      expect(body.generationConfig.imageConfig.aspectRatio).toBe("3:2");
    });

    it("bloqueio, resposta sem imagem e tipo estranho", async () => {
      const g = new GeminiGenerationGateway(imageConfig());
      fetchSpy.mockReturnValueOnce(
        ok({ promptFeedback: { blockReason: "SAFETY" } }),
      );
      expect(await kind(g.generateImage(imageReq))).toBe(
        AiProviderErrorKind.SAFETY,
      );
      fetchSpy.mockReturnValueOnce(
        ok({ candidates: [{ content: { parts: [{ text: "só texto" }] } }] }),
      );
      expect(await kind(g.generateImage(imageReq))).toBe(
        AiProviderErrorKind.SCHEMA,
      );
      fetchSpy.mockReturnValueOnce(
        ok({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { mimeType: "text/html", data: "AAAA" } },
                ],
              },
            },
          ],
        }),
      );
      expect(await kind(g.generateImage(imageReq))).toBe(
        AiProviderErrorKind.SCHEMA,
      );
    });
  });

  it("modelos e saúde pela configuração", async () => {
    const g = new GeminiGenerationGateway(config());
    expect(
      (await g.listModels(AiGenerationCapability.TEXT_STRUCTURED)).map(
        (m) => m.id,
      ),
    ).toEqual(["gemini-test"]);
    expect((await g.healthCheck()).code).toBe("CONFIGURED_NOT_PROBED");
    expect(
      (
        await new GeminiGenerationGateway(
          config({ CONTENT_STUDIO_GEMINI_ENABLED: "false" }),
        ).healthCheck()
      ).code,
    ).toBe("PROVIDER_NOT_CONFIGURED");
  });
});
