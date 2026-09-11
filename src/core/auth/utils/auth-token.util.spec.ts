import { UserRole } from "../auth.types";
import { RequestTokenCarriers } from "../types";
import {
  errorMessageOf,
  extractBearerToken,
  messageMatches,
  normalizeRole,
  toExpiresIn,
} from "./auth-token.util";

const request = (
  overrides: Partial<RequestTokenCarriers> = {},
): RequestTokenCarriers => ({ headers: {}, ...overrides });

describe("extractBearerToken", () => {
  it("reads the bearer token from the Authorization header", () => {
    expect(
      extractBearerToken(request({ headers: { authorization: "Bearer abc" } })),
    ).toBe("abc");
  });

  it("accepts the header name and the scheme in any casing", () => {
    expect(
      extractBearerToken(request({ headers: { Authorization: "bEaReR abc" } })),
    ).toBe("abc");
  });

  it("trims the token", () => {
    expect(
      extractBearerToken(
        request({ headers: { authorization: "Bearer  abc  " } }),
      ),
    ).toBe("abc");
  });

  it.each([
    ["outro esquema", "Basic abc"],
    ["sem token", "Bearer"],
    ["texto solto", "abc"],
  ])("ignores a header that is %s", (_label, header) => {
    expect(
      extractBearerToken(request({ headers: { authorization: header } })),
    ).toBeNull();
  });

  it("falls back to the access_token cookie", () => {
    expect(
      extractBearerToken(request({ cookies: { access_token: "do-cookie" } })),
    ).toBe("do-cookie");
  });

  it("also accepts the legacy auth_token cookie", () => {
    expect(
      extractBearerToken(request({ cookies: { auth_token: "legado" } })),
    ).toBe("legado");
  });

  it("falls back to the query string, for links the browser opens directly", () => {
    expect(
      extractBearerToken(request({ query: { access_token: "da-query" } })),
    ).toBe("da-query");
  });

  it("prefers the header over the cookie and the cookie over the query", () => {
    const full = request({
      headers: { authorization: "Bearer do-header" },
      cookies: { access_token: "do-cookie" },
      query: { access_token: "da-query" },
    });
    expect(extractBearerToken(full)).toBe("do-header");

    expect(
      extractBearerToken(
        request({
          cookies: { access_token: "do-cookie" },
          query: { access_token: "da-query" },
        }),
      ),
    ).toBe("do-cookie");
  });

  it("ignores carriers that hold something that is not a string", () => {
    expect(
      extractBearerToken(request({ cookies: { access_token: 42 }, query: {} })),
    ).toBeNull();
  });

  it("returns null when the request carries no token at all", () => {
    expect(extractBearerToken(request())).toBeNull();
  });
});

describe("normalizeRole", () => {
  it.each([
    ["admin", UserRole.ADMIN],
    ["ADMIN", UserRole.ADMIN],
    ["Leader", UserRole.LEADER],
    ["member", UserRole.MEMBER],
  ])("maps %s to the enum", (raw, expected) => {
    expect(normalizeRole(raw)).toBe(expected);
  });

  it.each([[undefined], [null], [""], ["auditor"]])("discards %p", (raw) => {
    expect(normalizeRole(raw)).toBeUndefined();
  });
});

describe("messageMatches", () => {
  it("finds the hint inside the message", () => {
    expect(
      messageMatches("Token used too late, sorry", ["Token used too late"]),
    ).toBe(true);
  });

  it("is false when no hint appears", () => {
    expect(messageMatches("network down", ["expired"])).toBe(false);
  });
});

describe("errorMessageOf", () => {
  it("reads the message of an Error", () => {
    expect(errorMessageOf(new Error("boom"))).toBe("boom");
  });

  it("stringifies whatever else was thrown", () => {
    expect(errorMessageOf("texto solto")).toBe("texto solto");
    expect(errorMessageOf(undefined)).toBe("undefined");
  });
});

describe("toExpiresIn", () => {
  it("passes the configured value through", () => {
    expect(toExpiresIn("7d")).toBe("7d");
  });
});
