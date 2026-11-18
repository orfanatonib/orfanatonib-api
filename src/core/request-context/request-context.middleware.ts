import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { REQUEST_ID_HEADER } from "./request-context.constants";
import { requestContextStorage } from "./request-context.storage";

/**
 * Abre o contexto da requisição: gera o `requestId` no servidor (o cabeçalho
 * enviado pelo cliente **não** é confiado), devolve-o em `X-Request-ID` e o
 * mantém disponível a todo o código assíncrono da requisição.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    requestContextStorage.run({ requestId }, next);
  }
}
