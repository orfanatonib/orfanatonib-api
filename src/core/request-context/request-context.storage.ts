import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  /** Identificador gerado **pelo servidor** para esta requisição. */
  readonly requestId: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
