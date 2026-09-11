import { getSmtpErrorMetadata, isRetryableSmtpError } from "./smtp-error.util";

describe("SMTP error utilities", () => {
  it("extracts only safe SMTP metadata", () => {
    expect(
      getSmtpErrorMetadata({
        name: "Error",
        code: "EAUTH",
        responseCode: 535,
        command: "AUTH PLAIN",
        message: "must not be included",
      }),
    ).toEqual({
      name: "Error",
      code: "EAUTH",
      responseCode: 535,
      command: "AUTH PLAIN",
    });
  });

  it("handles unknown non-object errors without exposing their content", () => {
    expect(getSmtpErrorMetadata("sensitive error")).toEqual({
      name: "UnknownSmtpError",
    });
  });

  it("recognizes transient SMTP response codes and connection errors", () => {
    expect(isRetryableSmtpError({ responseCode: 421 })).toBe(true);
    expect(isRetryableSmtpError({ code: "ECONNRESET" })).toBe(true);
    expect(isRetryableSmtpError({ responseCode: 535, code: "EAUTH" })).toBe(
      false,
    );
  });
});
