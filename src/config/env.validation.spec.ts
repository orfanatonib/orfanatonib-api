import { validateEnv } from "./env.validation";

const base = {
  JWT_SECRET: "segredo-de-teste",
  JWT_EXPIRES_IN: "15m",
  JWT_REFRESH_SECRET: "outro-segredo-de-teste",
};
const deployed = {
  ...base,
  ENVIRONMENT: "prod",
  DB_HOST: "db",
  DB_USERNAME: "u",
  DB_PASSWORD: "p",
  DB_NAME: "n",
  AWS_S3_BUCKET_NAME: "bucket",
};

describe("validateEnv", () => {
  it("FEED_ORFANATO_PAGE_ID, quando presente, precisa ser UUID (ausente continua aceito)", () => {
    expect(() =>
      validateEnv({ ...base, FEED_ORFANATO_PAGE_ID: "your_page_id" }),
    ).toThrow("FEED_ORFANATO_PAGE_ID deve ser um UUID");
    expect(() =>
      validateEnv({
        ...base,
        FEED_ORFANATO_PAGE_ID: "48d6278a-7c26-4a9f-90ce-2dedc47fe498",
      }),
    ).not.toThrow();
    expect(() => validateEnv({ ...base })).not.toThrow();
  });

  it("aceita o mínimo em ambiente local", () => {
    expect(validateEnv({ ...base })).toEqual(base);
  });

  it("recusa variáveis JWT ausentes e lista só os nomes", () => {
    expect(() => validateEnv({})).toThrow(
      "variáveis obrigatórias ausentes: JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET",
    );
  });

  it("não ecoa valores de segredos nas mensagens", () => {
    try {
      validateEnv({ ...base, ENVIRONMENT: "nada", PORT: "x" });
      fail("deveria lançar");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain(
        "segredo-de-teste",
      );
    }
  });

  it("recusa ENVIRONMENT desconhecido", () => {
    expect(() => validateEnv({ ...base, ENVIRONMENT: "qa" })).toThrow(
      "ENVIRONMENT deve ser um de",
    );
  });

  it.each(["staging", "prod", "production"])(
    "exige banco e bucket em %s",
    (environment) => {
      expect(() => validateEnv({ ...base, ENVIRONMENT: environment })).toThrow(
        "DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, AWS_S3_BUCKET_NAME",
      );
    },
  );

  it("aceita ambiente implantado completo", () => {
    expect(() => validateEnv({ ...deployed })).not.toThrow();
  });

  it("usa NODE_ENV quando ENVIRONMENT falta", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(
      "DB_HOST",
    );
  });

  it.each(["0", "70000", "abc", "1.5"])("recusa PORT inválida %s", (port) => {
    expect(() => validateEnv({ ...base, PORT: port })).toThrow("PORT deve ser");
  });

  it("recusa DB_PORT inválida", () => {
    expect(() => validateEnv({ ...base, DB_PORT: "99999" })).toThrow(
      "DB_PORT deve ser",
    );
  });

  it("valida CORS_ALLOWED_ORIGINS", () => {
    expect(() =>
      validateEnv({ ...base, CORS_ALLOWED_ORIGINS: "https://app.exemplo.com" }),
    ).not.toThrow();
    expect(() =>
      validateEnv({ ...base, CORS_ALLOWED_ORIGINS: "app.exemplo.com" }),
    ).toThrow("origem(ns) inválida(s)");
  });

  describe("AI_PROVIDER_MODE", () => {
    it.each(["live", "fake"])("aceita %s fora de produção", (mode) => {
      expect(() =>
        validateEnv({ ...base, AI_PROVIDER_MODE: mode }),
      ).not.toThrow();
    });

    it("recusa valor desconhecido", () => {
      expect(() => validateEnv({ ...base, AI_PROVIDER_MODE: "mock" })).toThrow(
        "AI_PROVIDER_MODE deve ser um de",
      );
    });

    it.each(["prod", "production"])("recusa fake em %s", (environment) => {
      expect(() =>
        validateEnv({
          ...deployed,
          ENVIRONMENT: environment,
          AI_PROVIDER_MODE: "fake",
        }),
      ).toThrow("proibido em produção");
    });

    it("permite live em produção", () => {
      expect(() =>
        validateEnv({ ...deployed, AI_PROVIDER_MODE: "live" }),
      ).not.toThrow();
    });
  });
});
