import { ConfiguredAiGenerationGateway } from "./configured-ai-generation.gateway";
import { AiProvider } from "./enums/ai-provider.enum";
import { AiGenerationGateway } from "./ai-generation.gateway";

const gateway = (name: string) =>
  ({
    generateStructuredText: jest.fn().mockResolvedValue({ provider: name }),
    generateImage: jest.fn().mockResolvedValue({ provider: name }),
    listModels: jest.fn().mockResolvedValue([]),
    healthCheck: jest.fn().mockResolvedValue({ status: name }),
  }) as unknown as AiGenerationGateway & { generateStructuredText: jest.Mock };

function setup(
  active: AiProvider | null,
  env?: string,
  fake?: AiGenerationGateway,
) {
  const openai = gateway("openai");
  const gemini = gateway("gemini");
  const overrides = { activeProvider: jest.fn().mockResolvedValue(active) };
  return {
    openai,
    gemini,
    overrides,
    svc: new ConfiguredAiGenerationGateway(
      env,
      overrides,
      openai,
      gemini,
      fake,
    ),
  };
}

const request = { instructions: [], input: {}, outputSchema: {} } as never;

describe("ConfiguredAiGenerationGateway", () => {
  it("o provedor ativo no painel (com chave salva) vence o ambiente", async () => {
    const { svc, gemini, openai } = setup(AiProvider.GEMINI, "openai");
    await svc.generateStructuredText(request);
    expect(gemini.generateStructuredText).toHaveBeenCalledTimes(1);
    expect(openai.generateStructuredText).not.toHaveBeenCalled();
  });

  it("painel sem chave salva: vale o provedor do ambiente (gemini) e, sem ambiente, OpenAI", async () => {
    const a = setup(null, "GEMINI");
    await a.svc.generateStructuredText(request);
    expect(a.gemini.generateStructuredText).toHaveBeenCalled();
    const b = setup(null, undefined);
    await b.svc.generateStructuredText(request);
    expect(b.openai.generateStructuredText).toHaveBeenCalled();
  });

  it("modo simulado ignora painel e ambiente (nunca chama LLM real)", async () => {
    const fake = gateway("fake");
    const { svc, openai, gemini, overrides } = setup(
      AiProvider.OPENAI,
      "gemini",
      fake,
    );
    await svc.generateStructuredText(request);
    expect(fake.generateStructuredText).toHaveBeenCalled();
    expect(openai.generateStructuredText).not.toHaveBeenCalled();
    expect(gemini.generateStructuredText).not.toHaveBeenCalled();
    expect(overrides.activeProvider).not.toHaveBeenCalled();
  });

  it("a escolha vale para imagem, modelos e saúde também", async () => {
    const { svc, openai } = setup(AiProvider.OPENAI);
    await svc.generateImage(request);
    await svc.listModels("TEXT_STRUCTURED" as never);
    await svc.healthCheck();
    expect(openai.generateImage).toHaveBeenCalled();
    expect(openai.listModels).toHaveBeenCalled();
    expect(openai.healthCheck).toHaveBeenCalled();
  });
});
