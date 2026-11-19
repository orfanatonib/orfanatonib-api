import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  geminiAspectRatio,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  resolveImageQuality,
  resolveImageSize,
  resolveMaxOutputTokens,
} from "./generation-options.util";

describe("generation-options", () => {
  it("tokens: padrão, limites e valores inválidos", () => {
    expect(resolveMaxOutputTokens()).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens(null)).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens(Number.NaN)).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens(10)).toBe(MIN_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens(1_000_000)).toBe(MAX_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens(6000.9)).toBe(6000);
  });
  it("imagem: só aceita valores conhecidos", () => {
    expect(resolveImageSize("1536x1024")).toBe("1536x1024");
    expect(resolveImageSize("9999x9999")).toBe("1024x1024");
    expect(resolveImageQuality("high")).toBe("high");
    expect(resolveImageQuality("ultra")).toBe("low");
  });
  it("proporção do Gemini", () => {
    expect(geminiAspectRatio("1024x1024")).toBe("1:1");
    expect(geminiAspectRatio("1024x1536")).toBe("2:3");
    expect(geminiAspectRatio("1536x1024")).toBe("3:2");
  });
});
