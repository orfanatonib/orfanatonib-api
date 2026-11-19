import { ConfigService } from "@nestjs/config";

import { GeminiGenerationGateway } from "./gemini-generation.gateway";
import { OpenAiGenerationGateway } from "./openai-generation.gateway";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { StudioProviderOverrides } from "./provider-overrides.service";

const noEnv = { get: jest.fn(() => undefined) } as unknown as ConfigService;
const request = {
  correlationId: "c",
  instructions: [],
  input: { theme: "Esperança" },
  outputSchema: { type: "object" },
} as never;

const respond = (body: unknown) =>
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue({ ok: true, json: async () => body } as Response);

afterEach(() => jest.restoreAllMocks());

describe("o painel de provedores vale para o Estúdio (sem variável de ambiente)", () => {
  it("OpenAI: usa a chave e o modelo de texto SALVOS no painel", async () => {
    const overrides = {
      forProvider: jest
        .fn()
        .mockResolvedValue({
          apiKey: "chave-do-painel",
          textModel: "gpt-painel",
          imageModel: "img",
        }),
    };
    const fetchSpy = respond({
      output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }],
    });
    const gateway = new OpenAiGenerationGateway(
      noEnv,
      overrides as unknown as StudioProviderOverrides,
    );
    await gateway.generateStructuredText(request);
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer chave-do-painel",
    });
    expect(JSON.parse((init as RequestInit).body as string).model).toBe(
      "gpt-painel",
    );
  });

  it("Gemini: usa a chave (header) e o modelo SALVOS no painel", async () => {
    const overrides = {
      forProvider: jest
        .fn()
        .mockResolvedValue({
          apiKey: "chave-gemini-painel",
          textModel: "gemini-painel",
          imageModel: "img",
        }),
    };
    const fetchSpy = respond({
      candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
    });
    const gateway = new GeminiGenerationGateway(
      noEnv,
      overrides as unknown as StudioProviderOverrides,
    );
    await gateway.generateStructuredText(request);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/models/gemini-painel:generateContent");
    expect((init as RequestInit).headers).toMatchObject({
      "x-goog-api-key": "chave-gemini-painel",
    });
  });

  it("sem chave no painel e sem ambiente: AUTHENTICATION e nenhuma chamada de rede", async () => {
    const overrides = { forProvider: jest.fn().mockResolvedValue(null) };
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    const gateway = new OpenAiGenerationGateway(
      noEnv,
      overrides as unknown as StudioProviderOverrides,
    );
    await expect(gateway.generateStructuredText(request)).rejects.toMatchObject(
      { kind: AiProviderErrorKind.AUTHENTICATION },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("painel com chave mas sem modelo salvo: NOT_FOUND_MODEL", async () => {
    const overrides = {
      forProvider: jest
        .fn()
        .mockResolvedValue({ apiKey: "k", textModel: "", imageModel: "" }),
    };
    const gateway = new OpenAiGenerationGateway(
      noEnv,
      overrides as unknown as StudioProviderOverrides,
    );
    await expect(gateway.generateStructuredText(request)).rejects.toMatchObject(
      { kind: AiProviderErrorKind.NOT_FOUND_MODEL },
    );
  });
});
