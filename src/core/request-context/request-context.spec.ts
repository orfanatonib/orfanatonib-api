import type { NextFunction, Request, Response } from "express";

import { REQUEST_ID_HEADER } from "./request-context.constants";
import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestContextService } from "./request-context.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function enter(
  middleware: RequestContextMiddleware,
  fromClient?: string,
  then?: () => Promise<void> | void,
): { header?: string; done: Promise<void> } {
  const result: { header?: string; done: Promise<void> } = {
    done: Promise.resolve(),
  };
  const response = {
    setHeader: (name: string, value: string) => {
      if (name === REQUEST_ID_HEADER) result.header = value;
    },
  } as unknown as Response;
  const request = {
    headers: fromClient ? { "x-request-id": fromClient } : {},
  } as unknown as Request;
  const next: NextFunction = () => {
    result.done = Promise.resolve(then?.());
  };
  middleware.use(request, response, next);
  return result;
}

describe("contexto da requisição", () => {
  const middleware = new RequestContextMiddleware();
  const service = new RequestContextService();

  it("fora de uma requisição devolve 'unknown'", () => {
    expect(service.getRequestId()).toBe("unknown");
  });

  it("gera um UUID no servidor, devolve em X-Request-ID e o mantém no código assíncrono", async () => {
    let seen = "";
    const { header, done } = enter(middleware, undefined, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      seen = service.getRequestId();
    });
    await done;
    expect(header).toMatch(UUID);
    expect(seen).toBe(header);
  });

  it("não confia no X-Request-ID enviado pelo cliente", async () => {
    let seen = "";
    const { header, done } = enter(middleware, "valor-do-cliente", () => {
      seen = service.getRequestId();
    });
    await done;
    expect(header).not.toBe("valor-do-cliente");
    expect(seen).toBe(header);
  });

  it("requisições concorrentes não misturam os ids", async () => {
    const seen: Record<string, string> = {};
    const runs = ["a", "b", "c", "d", "e"].map((name, i) =>
      enter(middleware, undefined, async () => {
        await new Promise((resolve) => setTimeout(resolve, (5 - i) * 3));
        seen[name] = service.getRequestId();
      }),
    );
    await Promise.all(runs.map((r) => r.done));
    runs.forEach((run, i) => expect(seen["abcde"[i]]).toBe(run.header));
    expect(new Set(Object.values(seen)).size).toBe(5);
  });
});
