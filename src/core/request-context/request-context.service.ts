import { Injectable } from "@nestjs/common";

import { NO_REQUEST_ID } from "./request-context.constants";
import { requestContextStorage } from "./request-context.storage";

@Injectable()
export class RequestContextService {
  /** `requestId` da requisição em andamento; `"unknown"` fora de uma requisição. */
  getRequestId(): string {
    return requestContextStorage.getStore()?.requestId ?? NO_REQUEST_ID;
  }
}
