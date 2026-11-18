import { createCorsOptions, parseAllowedOrigins } from "./cors.config";

type OriginFn = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => void;

const decide = (
  options: ReturnType<typeof createCorsOptions>,
  origin?: string,
) => {
  let result: boolean | undefined;
  (options.origin as OriginFn)(origin, (_error, allow) => {
    result = allow;
  });
  return result;
};

describe("parseAllowedOrigins", () => {
  it("normaliza, remove duplicadas e ignora vazios", () => {
    expect(
      parseAllowedOrigins(
        " https://a.com/ , https://a.com,http://localhost:5173 ,, ",
      ),
    ).toEqual({
      origins: ["https://a.com", "http://localhost:5173"],
      invalid: [],
    });
  });

  it("separa as inválidas (sem protocolo, com caminho, outro protocolo)", () => {
    const { origins, invalid } = parseAllowedOrigins(
      "a.com,https://a.com/x,ftp://a.com,https://ok.com",
    );
    expect(origins).toEqual(["https://ok.com"]);
    expect(invalid).toEqual(["a.com", "https://a.com/x", "ftp://a.com"]);
  });

  it("aceita undefined", () => {
    expect(parseAllowedOrigins(undefined)).toEqual({
      origins: [],
      invalid: [],
    });
  });
});

describe("createCorsOptions", () => {
  it("sem lista mantém o comportamento anterior (reflete a origem)", () => {
    const options = createCorsOptions([]);
    expect(options.origin).toBe(true);
    expect(options.credentials).toBe(true);
  });

  it("com lista aceita só origens declaradas", () => {
    const options = createCorsOptions(["https://app.exemplo.com"]);
    expect(decide(options, "https://app.exemplo.com")).toBe(true);
    expect(decide(options, "https://malicioso.com")).toBe(false);
  });

  it("requisição sem Origin (health check, curl) não é bloqueada", () => {
    expect(
      decide(createCorsOptions(["https://app.exemplo.com"]), undefined),
    ).toBe(true);
  });
});
