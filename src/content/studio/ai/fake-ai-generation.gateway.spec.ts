import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { FakeAiGenerationGateway } from "./fake-ai-generation.gateway";
import { AiProviderRequestError } from "./openai-generation.gateway";

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      minItems: 2,
      items: { type: "object", properties: { n: { type: "integer" } } },
    },
    level: { enum: ["facil", "dificil"] },
  },
};
const req = (text: string, id = "j1") => ({
  correlationId: id,
  instructions: [text],
  input: {},
  outputSchema: schema,
});
const kindOf = async (
  p: Promise<unknown>,
): Promise<AiProviderErrorKind | null> => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof AiProviderRequestError ? e.kind : null;
  }
};

describe("FakeAiGenerationGateway", () => {
  const make = (quota?: number) =>
    new FakeAiGenerationGateway("fake", "local", quota);

  it("recusa ser criado em produção ou fora do modo fake", () => {
    expect(() => new FakeAiGenerationGateway("fake", "prod")).toThrow();
    expect(() => new FakeAiGenerationGateway("live", "local")).toThrow();
  });

  it("gera saída determinística que respeita o schema e informa uso de tokens", async () => {
    const out = await make().generateStructuredText(req("escreva"));
    expect(out.provider).toBe("FAKE");
    expect(out.output).toEqual({
      title: "texto simulado",
      items: [{ n: 1 }, { n: 1 }],
      level: "facil",
    });
    expect(out.usage?.totalTokens).toBeGreaterThan(0);
  });

  it.each([
    ["[[fake:429]]", AiProviderErrorKind.RATE_LIMIT],
    ["[[fake:quota]]", AiProviderErrorKind.QUOTA],
    ["[[fake:timeout]]", AiProviderErrorKind.TIMEOUT],
    ["[[fake:moderation]]", AiProviderErrorKind.SAFETY],
    ["[[fake:500]]", AiProviderErrorKind.SERVER],
    ["[[fake:schema]]", AiProviderErrorKind.SCHEMA],
    ["[[fake:network]]", AiProviderErrorKind.NETWORK],
  ])("diretiva %s vira %s", async (directive, kind) => {
    expect(await kindOf(make().generateStructuredText(req(directive)))).toBe(
      kind,
    );
  });

  it("[[fake:429:2]] falha 2 vezes por job e depois funciona", async () => {
    const g = make();
    const kinds: Array<AiProviderErrorKind | null> = [];
    for (let i = 0; i < 3; i++)
      kinds.push(await kindOf(g.generateStructuredText(req("[[fake:429:2]]"))));
    expect(kinds).toEqual([
      AiProviderErrorKind.RATE_LIMIT,
      AiProviderErrorKind.RATE_LIMIT,
      null,
    ]);
  });

  it("cota simulada acaba: depois do saldo, QUOTA", async () => {
    const g = make(60);
    expect(await kindOf(g.generateStructuredText(req("a")))).toBeNull();
    let last: AiProviderErrorKind | null = null;
    for (let i = 0; i < 60 && last === null; i++)
      last = await kindOf(g.generateStructuredText(req("b", `j${i}`)));
    expect(last).toBe(AiProviderErrorKind.QUOTA);
  });

  it("imagem, modelos e saúde", async () => {
    const g = make();
    const img = await g.generateImage({
      correlationId: "i",
      instructions: ["x"],
      input: {},
    });
    expect(img.mediaType).toBe("image/png");
    expect(img.bytes.length).toBeGreaterThan(10);
    expect(
      await kindOf(
        g.generateImage({
          correlationId: "i2",
          instructions: ["[[fake:429]]"],
          input: {},
        }),
      ),
    ).toBe(AiProviderErrorKind.RATE_LIMIT);
    expect((await g.listModels("TEXT_STRUCTURED" as never))[0].id).toBe(
      "fake-model-1",
    );
    expect((await g.healthCheck()).status).toBe("HEALTHY");
  });
});
