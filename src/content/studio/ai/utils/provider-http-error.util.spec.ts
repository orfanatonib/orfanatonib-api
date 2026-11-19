import { AiProviderErrorKind as K } from "../enums/ai-provider-error-kind.enum";
import { classifyProviderHttpError } from "./provider-http-error.util";

describe("classifyProviderHttpError", () => {
  it.each([
    [{ status: 401 }, K.AUTHENTICATION],
    [{ status: 403 }, K.AUTHENTICATION],
    [{ status: 408 }, K.TIMEOUT],
    [{ status: 429, code: "rate_limit_exceeded" }, K.RATE_LIMIT],
    [{ status: 429, code: "insufficient_quota" }, K.QUOTA],
    [
      { status: 429, message: "Quota exceeded for quota metric per minute" },
      K.RATE_LIMIT,
    ],
    [{ status: 500 }, K.SERVER],
    [{ status: 503 }, K.SERVER],
    [{ status: 400, code: "moderation_blocked" }, K.SAFETY],
    [{ status: 400, message: "blocked by safety settings" }, K.SAFETY],
    [{ status: 404, code: "model_not_found" }, K.NOT_FOUND_MODEL],
    [
      { status: 400, message: "The model `x` does not exist" },
      K.NOT_FOUND_MODEL,
    ],
    [{ status: 400, code: "context_length_exceeded" }, K.CONTEXT_LENGTH],
    [{ status: 413 }, K.CONTEXT_LENGTH],
    [{ status: 400, message: "Invalid schema for response_format" }, K.SCHEMA],
    [
      { status: 400, message: "temperature must be between 0 and 2" },
      K.INVALID_REQUEST,
    ],
    [{ status: 422 }, K.INVALID_REQUEST],
  ])("%j → %s", (error, expected) => {
    expect(classifyProviderHttpError(error)).toBe(expected);
  });
});
