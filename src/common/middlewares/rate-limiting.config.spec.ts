import { AppModule } from "../../app.module";
import { RateLimitingMiddleware } from "./rate-limiting.middleware";

describe("limitação de taxa (opt-in)", () => {
  const consumerMock = () => {
    const forRoutes = jest.fn();
    const apply = jest.fn(() => ({ forRoutes }));
    return { apply, forRoutes };
  };

  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
  });

  it("desligada por padrão: nenhum middleware é aplicado", () => {
    const c = consumerMock();
    new AppModule().configure(c as never);
    expect(c.apply).not.toHaveBeenCalled();
  });

  it("RATE_LIMIT_ENABLED=true aplica o middleware a todas as rotas", () => {
    process.env.RATE_LIMIT_ENABLED = "true";
    const c = consumerMock();
    new AppModule().configure(c as never);
    expect(c.apply).toHaveBeenCalledWith(RateLimitingMiddleware);
    expect(c.forRoutes).toHaveBeenCalledWith("*");
  });

  it("classifica pela URL original: login é 'auth', multipart é 'upload', escrita é 'write', leitura 'general'", () => {
    const mw = new RateLimitingMiddleware() as unknown as {
      getLimiterForRoute: (r: unknown) => unknown;
      limiters: Map<string, unknown>;
    };
    const pick = (
      method: string,
      originalUrl: string,
      headers: Record<string, string> = {},
    ) => mw.getLimiterForRoute({ method, originalUrl, url: "/x", headers });
    expect(pick("POST", "/auth/login")).toBe(mw.limiters.get("auth"));
    expect(
      pick("POST", "/events", {
        "content-type": "multipart/form-data; boundary=x",
      }),
    ).toBe(mw.limiters.get("upload"));
    expect(pick("DELETE", "/teams/1")).toBe(mw.limiters.get("write"));
    expect(pick("GET", "/routes")).toBe(mw.limiters.get("general"));
  });
});
