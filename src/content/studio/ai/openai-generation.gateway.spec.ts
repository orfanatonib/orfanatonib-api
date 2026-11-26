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

  it("usa os parâmetros do pedido (tokens, tamanho, qualidade) dentro dos limites", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    const respond = (body: unknown) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      } as Response);
    const gateway = new OpenAiGenerationGateway(config);

    fetchSpy.mockReturnValueOnce(
      respond({ output: [{ content: [{ type: "output_text", text: "{}" }] }] }),
    );
    await gateway.generateStructuredText({
      correlationId: "c",
      instructions: [],
      input: {},
      outputSchema: { type: "object" },
      maxOutputTokens: 9_999_999,
    });
    const text = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    ) as { max_output_tokens: number };
    expect(text.max_output_tokens).toBe(16_000);

    fetchSpy.mockReturnValueOnce(respond({ data: [{ b64_json: "iVBORw0=" }] }));
    await gateway.generateImage({
      correlationId: "c",
      instructions: [],
      input: {},
      size: "1536x1024",
      quality: "bogus",
    });
    const image = JSON.parse(
      (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
    ) as { size: string; quality: string };
    expect(image).toMatchObject({ size: "1536x1024", quality: "low" });

    // Com imagem de referência: edição em multipart, com os mesmos campos e a imagem anexada.
    fetchSpy.mockReturnValueOnce(respond({ data: [{ b64_json: "iVBORw0=" }] }));
    await gateway.generateImage({
      correlationId: "c",
      instructions: ["peça"],
      input: {},
      size: "1536x1024",
      referenceImages: [
        { mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]) },
      ],
    });
    const [url, init] = fetchSpy.mock.calls[2] as [string, RequestInit];
    expect(url).toContain("/images/edits");
    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("size")).toBe("1536x1024");
    expect(String(form.get("prompt"))).toContain("peça");
    expect((form.get("image[]") as Blob).size).toBe(3);
    expect(
      (init.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
    fetchSpy.mockRestore();
  });
});
