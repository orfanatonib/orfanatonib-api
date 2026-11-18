import { ConfigService } from "@nestjs/config";

import {
  AiProviderRequestError,
  OpenAiGenerationGateway,
} from "./openai-generation.gateway";
import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";

describe("OpenAiGenerationGateway", () => {
  const values: Record<string, string> = {
    CONTENT_STUDIO_OPENAI_ENABLED: "true",
    CONTENT_STUDIO_OPENAI_API_KEY: "test-only-not-a-real-key",
    CONTENT_STUDIO_OPENAI_TEXT_MODELS: "text-model-a,text-model-b",
    CONTENT_STUDIO_OPENAI_IMAGE_MODELS: "image-model-a",
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    values.CONTENT_STUDIO_OPENAI_TEXT_MODELS = "text-model-a,text-model-b";
    jest.clearAllMocks();
  });

  it("lists only deployment allowlisted models for the requested capability", async () => {
    const gateway = new OpenAiGenerationGateway(config);

    await expect(
      gateway.listModels(AiGenerationCapability.TEXT_STRUCTURED),
    ).resolves.toEqual([
      expect.objectContaining({ id: "text-model-a" }),
      expect.objectContaining({ id: "text-model-b" }),
    ]);
    await expect(
      gateway.listModels(AiGenerationCapability.IMAGE_GENERATION),
    ).resolves.toEqual([expect.objectContaining({ id: "image-model-a" })]);
  });

  it("does not probe the provider during readiness checks", async () => {
    const gateway = new OpenAiGenerationGateway(config);
    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const result = await gateway.healthCheck();

    expect(result.code).toBe("CONFIGURED_NOT_PROBED");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("refuses provider calls unless a capability model is allowlisted", async () => {
    values.CONTENT_STUDIO_OPENAI_TEXT_MODELS = "";
    const gateway = new OpenAiGenerationGateway(config);
    const fetchSpy = jest.spyOn(globalThis, "fetch");

    await expect(
      gateway.generateStructuredText({
        correlationId: "correlation-test",
        instructions: [],
        input: { theme: "Esperança" },
        outputSchema: { type: "object" },
      }),
    ).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("requests structured output without provider-side response storage", async () => {
    const gateway = new OpenAiGenerationGateway(config);
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: '{"title":"Lição"}' }] },
          ],
          usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await gateway.generateStructuredText({
      correlationId: "local-correlation",
      instructions: ["Use linguagem apropriada à faixa."],
      input: { theme: "Esperança" },
      outputSchema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    });

    expect(result.output).toEqual({ title: "Lição" });
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(body.store).toBe(false);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.model).toBe("text-model-a");
    fetchSpy.mockRestore();
  });

  it("rejects sensitive fields returned by the provider", async () => {
    const gateway = new OpenAiGenerationGateway(config);
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { type: "output_text", text: '{"childName":"Pessoa"}' },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      gateway.generateStructuredText({
        correlationId: "local-correlation",
        instructions: [],
        input: { theme: "Esperança" },
        outputSchema: { type: "object" },
      }),
    ).rejects.toMatchObject<Partial<AiProviderRequestError>>({
      kind: AiProviderErrorKind.SAFETY,
      message: expect.stringContaining("não conseguiu concluir"),
    });
    fetchSpy.mockRestore();
  });
});
