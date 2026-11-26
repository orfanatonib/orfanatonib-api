import { createdRange } from "./list-query.util";

describe("createdRange", () => {
  it("lê o intervalo SEMPRE no fuso local do servidor (nunca o dia UTC)", () => {
    const { from, to } = createdRange({
      createdFrom: "2026-11-22",
      createdTo: "2026-11-22",
    });

    expect(from?.getTime()).toBe(new Date(2026, 10, 22, 0, 0, 0, 0).getTime());
    expect(to?.getTime()).toBe(new Date(2026, 10, 22, 23, 59, 59, 999).getTime());
  });

  it("o dia inteiro cabe no intervalo: das 00:00:00 às 23:59:59.999 locais", () => {
    const { from, to } = createdRange({ createdFrom: "2026-01-05", createdTo: "2026-01-05" });
    const noon = new Date(2026, 0, 5, 12, 0, 0, 0).getTime();

    expect(from!.getTime()).toBeLessThan(noon);
    expect(to!.getTime()).toBeGreaterThan(noon);
    expect(to!.getTime() - from!.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("sem datas não restringe nada", () => {
    expect(createdRange({})).toEqual({ from: undefined, to: undefined });
  });
});
