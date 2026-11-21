import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { COMPLETION_TOKEN_PURPOSE } from "../constants/auth.constants";
import { CompletionTokenService } from "./completion-token.service";

describe("CompletionTokenService", () => {
  const SESSION_SECRET = "session-secret";
  const config = {
    getOrThrow: (key: string): string => {
      if (key === "JWT_SECRET") return SESSION_SECRET;
      throw new Error(`unexpected ${key}`);
    },
  } as unknown as ConfigService;
  const jwt = new JwtService({ secret: SESSION_SECRET });
  const service = new CompletionTokenService(jwt, config);

  it("[auth.post.auth-complete-register#feliz] issues a token that verifies back to the user id", () => {
    expect(service.verify(service.issueFor("user-1"))).toBe("user-1");
  });

  it("issues a short-lived token (about 15 minutes)", () => {
    const payload = service.issueFor("user-1").split(".")[1] ?? "";
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp: number; iat: number };
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  it("[auth.post.auth-complete-register#token-expirado] rejects an expired token", () => {
    jest.useFakeTimers().setSystemTime(Date.now() - 16 * 60 * 1000);
    const token = service.issueFor("user-1");
    jest.useRealTimers();

    expect(service.verify(token)).toBeNull();
  });

  it("[auth.post.auth-complete-register#token-proposito-errado] rejects the session JWT, a token with another purpose and a tampered one", () => {
    const sessionJwt = jwt.sign({ sub: "user-1", role: "member" });
    expect(service.verify(sessionJwt)).toBeNull();

    const otherPurpose = new CompletionTokenService(jwt, config);
    const forged = jwt.sign(
      { sub: "user-1", purpose: COMPLETION_TOKEN_PURPOSE },
      { secret: SESSION_SECRET },
    );
    expect(otherPurpose.verify(forged)).toBeNull();

    const valid = service.issueFor("user-1");
    expect(service.verify(`${valid}x`)).toBeNull();
    expect(service.verify("")).toBeNull();
    expect(service.verify("not-a-jwt")).toBeNull();
  });

  it("a completion token is not accepted as a session token", () => {
    expect(() => {
      jwt.verify(service.issueFor("user-1"));
    }).toThrow();
  });
});
