import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { EntityNotFoundError, QueryFailedError, TypeORMError } from "typeorm";

import { ErrorCategory } from "../exceptions/error-category.enum";
import { AccessDeniedException } from "../exceptions";
import { GlobalExceptionFilter } from "./http-exception.filter";

interface Captured {
  status?: number;
  body?: Record<string, unknown>;
}

function run(
  filter: GlobalExceptionFilter,
  exception: unknown,
  url = "/rota?searchString=Maria%20da%20Silva",
): Captured {
  const captured: Captured = {};
  const response = {
    status: (code: number) => {
      captured.status = code;
      return {
        json: (body: Record<string, unknown>) => (captured.body = body),
      };
    },
  };
  const request = {
    url,
    originalUrl: url,
    method: "GET",
    headers: {},
    ip: "10.0.0.9",
    get: () => "Mozilla/5.0",
    user: { id: "user-1" },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  filter.catch(exception, host);
  return captured;
}

const queryFailed = (
  code: string,
  extra: Record<string, unknown> = {},
): QueryFailedError =>
  new QueryFailedError("SELECT", [], { code, ...extra } as unknown as Error);

describe("GlobalExceptionFilter — contrato de erro", () => {
  let filter: GlobalExceptionFilter;
  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.spyOn(filter["logger"], "error").mockImplementation(() => undefined);
    jest.spyOn(filter["logger"], "warn").mockImplementation(() => undefined);
    jest.spyOn(filter["logger"], "log").mockImplementation(() => undefined);
  });

  it("corpo traz statusCode, message, error, category, timestamp, path, requestId e correlationId", () => {
    const { status, body } = run(filter, new NotFoundException("Sem isso"));
    expect(status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      message: "Sem isso",
      error: "Not Found",
      category: ErrorCategory.BUSINESS,
    });
    expect(typeof body?.timestamp).toBe("string");
    expect(body?.correlationId).toMatch(/^corr-/);
    expect(body).toHaveProperty("requestId");
  });

  it.each([
    [new BadRequestException("x"), 400, "Bad Request", ErrorCategory.RULE],
    [
      new UnauthorizedException("x"),
      401,
      "Unauthorized",
      ErrorCategory.BUSINESS,
    ],
    [new ForbiddenException("x"), 403, "Forbidden", ErrorCategory.BUSINESS],
    [new ConflictException("x"), 409, "Conflict", ErrorCategory.BUSINESS],
    [
      new HttpException("x", 503),
      503,
      "Service Unavailable",
      ErrorCategory.SERVER,
    ],
  ])(
    "HttpException %#: status/nome/categoria",
    (exception, statusCode, error, category) => {
      const { status, body } = run(filter, exception);
      expect(status).toBe(statusCode);
      expect(body).toMatchObject({ error, category });
    },
  );

  it("AppException preserva categoria, mensagem e details", () => {
    const { status, body } = run(
      filter,
      new AccessDeniedException("Sem acesso", { motivo: "x" }),
    );
    expect(status).toBe(403);
    expect(body).toMatchObject({
      message: "Sem acesso",
      category: ErrorCategory.BUSINESS,
      details: { motivo: "x" },
    });
  });

  it("EntityNotFoundError vira 404 genérico", () => {
    const { status, body } = run(filter, new EntityNotFoundError("User", {}));
    expect(status).toBe(404);
    expect(body).toMatchObject({
      message: "Resource not found",
      category: ErrorCategory.BUSINESS,
    });
  });

  it.each([
    ["ER_DUP_ENTRY", 409, ErrorCategory.BUSINESS],
    ["ER_NO_REFERENCED_ROW_2", 400, ErrorCategory.RULE],
    ["ER_ROW_IS_REFERENCED_2", 409, ErrorCategory.RULE],
    ["ER_DATA_TOO_LONG", 400, ErrorCategory.RULE],
    ["ER_OUTRO", 500, ErrorCategory.SERVER],
  ])("QueryFailedError %s → %i", (code, statusCode, category) => {
    const { status, body } = run(filter, queryFailed(code));
    expect(status).toBe(statusCode);
    expect(body?.category).toBe(category);
  });

  it("TypeORMError genérico vira 500 sem detalhes", () => {
    const { status, body } = run(filter, new TypeORMError("boom"));
    expect(status).toBe(500);
    expect(body).toMatchObject({
      message: "Database operation failed",
      category: ErrorCategory.SERVER,
    });
  });

  it("valor que não é Error vira 500 'Unknown error occurred'", () => {
    const { status, body } = run(filter, "texto solto");
    expect(status).toBe(500);
    expect(body?.message).toBe("Unknown error occurred");
  });
});

describe("GlobalExceptionFilter — não vazar internals (regressão)", () => {
  let filter: GlobalExceptionFilter;
  beforeEach(() => {
    filter = new GlobalExceptionFilter(undefined, undefined, {
      exposeInternalErrors: false,
    });
    for (const level of ["error", "warn", "log"] as const) {
      jest.spyOn(filter["logger"], level).mockImplementation(() => undefined);
    }
  });

  it("Error comum em ambiente implantado não devolve stack nem a mensagem interna", () => {
    const { status, body } = run(
      filter,
      new Error("SELECT * FROM users WHERE senha = 'x' falhou"),
    );
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("stack");
    expect(JSON.stringify(body)).not.toContain("SELECT");
    expect(body?.message).toBe("Internal server error");
  });

  it("nunca devolve stack, nem em ambiente de desenvolvimento", () => {
    const dev = new GlobalExceptionFilter(undefined, undefined, {
      exposeInternalErrors: true,
    });
    jest.spyOn(dev["logger"], "error").mockImplementation(() => undefined);
    const { body } = run(dev, new Error("falhou em dev"));
    expect(body?.message).toBe("falhou em dev");
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  it("valor desconhecido não devolve originalError", () => {
    const { body } = run(filter, { segredo: "abc" });
    expect(JSON.stringify(body)).not.toContain("originalError");
  });
});

describe("GlobalExceptionFilter — registro (log) sem dado pessoal", () => {
  it("o log não contém query string, IP nem User-Agent; e há um registro só", () => {
    const filter = new GlobalExceptionFilter(undefined, undefined, {
      exposeInternalErrors: false,
    });
    const error = jest
      .spyOn(filter["logger"], "error")
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(filter["logger"], "warn")
      .mockImplementation(() => undefined);
    run(filter, new Error("boom"));
    run(filter, new BadRequestException("x"));
    const serialized = JSON.stringify([
      ...error.mock.calls,
      ...warn.mock.calls,
    ]);
    expect(serialized).not.toContain("Maria");
    expect(serialized).not.toContain("searchString");
    expect(serialized).not.toContain("10.0.0.9");
    expect(serialized).not.toContain("Mozilla");
    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
