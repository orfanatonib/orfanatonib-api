/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";

import { UploadScopeInterceptor } from "./upload-scope.interceptor";
import { currentUploadScope } from "./upload-scope";

function setup(referenced: string[] = []) {
  const s3 = {
    setDeleteFailureHandler: jest.fn(),
    getBucketName: () => "b",
    deleteKey: jest.fn(async () => undefined),
  };
  const refs = {
    isReferenced: jest.fn(async (url: string) => referenced.includes(url)),
  };
  const queue = { enqueue: jest.fn(async () => undefined) };
  const interceptor = new UploadScopeInterceptor(
    s3 as never,
    refs as never,
    queue as never,
  );
  const http = { getType: () => "http" } as unknown as ExecutionContext;
  return { s3, queue, interceptor, http };
}

const NEW = "http://x/b/local/uploads/new.png";
const OLD = "http://x/b/local/uploads/old.png";

describe("UploadScopeInterceptor", () => {
  it("[media-upload.scope.interceptor#sucesso-aplica-exclusoes] sucesso: exclusões adiadas rodam depois, mas só se ninguém mais referencia o arquivo", async () => {
    const { interceptor, http, s3 } = setup([OLD]);
    const handler = {
      handle: () => {
        currentUploadScope()?.deferDelete(OLD);
        currentUploadScope()?.deferDelete("http://x/b/local/uploads/gone.png");
        return of("ok");
      },
    };
    expect(await lastValueFrom(interceptor.intercept(http, handler))).toBe(
      "ok",
    );
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteKey).toHaveBeenCalledWith("local/uploads/gone.png");
  });

  it("[media-upload.scope.interceptor#falha-descarta-uploads-sem-referencia] falha: exclusões adiadas são descartadas e só uploads SEM referência são removidos", async () => {
    const { interceptor, http, s3 } = setup([
      "http://x/b/local/uploads/kept.png",
    ]);
    const handler = {
      handle: () => {
        const sc = currentUploadScope();
        sc?.deferDelete(OLD);
        sc?.recordUpload(NEW);
        sc?.recordUpload("http://x/b/local/uploads/kept.png");
        return throwError(() => new Error("boom"));
      },
    };
    await expect(
      lastValueFrom(interceptor.intercept(http, handler)),
    ).rejects.toThrow("boom");
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteKey).toHaveBeenCalledWith("local/uploads/new.png");
  });

  it("[media-upload.scope.interceptor#falha-de-remocao-vai-para-fila] falha ao apagar vai para a fila de limpeza; contexto não-HTTP passa direto", async () => {
    const { interceptor, http, s3, queue } = setup();
    s3.deleteKey.mockRejectedValue(new Error("denied"));
    const handler = {
      handle: () => {
        currentUploadScope()?.deferDelete(OLD);
        return of(1);
      },
    };
    await lastValueFrom(interceptor.intercept(http, handler));
    expect(queue.enqueue).toHaveBeenCalledWith(
      "local/uploads/old.png",
      "denied",
    );

    const rpc = { getType: () => "rpc" } as unknown as ExecutionContext;
    expect(
      await lastValueFrom(
        interceptor.intercept(rpc, { handle: () => of("x") }),
      ),
    ).toBe("x");
  });
});
