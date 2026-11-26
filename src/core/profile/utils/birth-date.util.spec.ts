import { parseBirthDate } from "./birth-date.util";

describe("parseBirthDate", () => {
  it("YYYY-MM-DD vira a meia-noite local do MESMO dia (nunca o dia anterior)", () => {
    const date = parseBirthDate("2001-05-10");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2001, 4, 10,
    ]);
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it("ISO com hora usa só a parte da data", () => {
    const date = parseBirthDate("2000-02-29T23:30:00.000Z");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2000, 1, 29,
    ]);
  });

  it("formato desconhecido cai no parser padrão", () => {
    expect(parseBirthDate("2001/05/10").getFullYear()).toBe(2001);
  });
});
