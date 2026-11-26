import { isHoneypotTripped } from "./contact-honeypot.util";

describe("isHoneypotTripped", () => {
  it.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["   ", false],
    ["http://spam.example", true],
    [" x ", true],
    [123, false],
  ])("%p → %p", (value, expected) => {
    expect(isHoneypotTripped(value)).toBe(expected);
  });
});
