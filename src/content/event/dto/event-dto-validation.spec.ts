import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateEventDto } from "./create-event.dto";
import { UpdateEventDto } from "./update-event.dto";

const failing = <T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(plainToInstance(type, payload)).map((error) => error.property);

const base = {
  title: "Culto",
  date: "2099-12-01",
  location: "Igreja",
  description: "d",
  audience: "all",
};

describe("CreateEventDto / UpdateEventDto — data", () => {
  it.each(["2099-12-01", "2099-12-01T10:00:00", "2099-12-01T13:00:00.000Z"])(
    "accepts %p (a data do formulário é ISO, com ou sem hora)",
    (date) => {
      expect(failing(CreateEventDto, { ...base, date })).toEqual([]);
      expect(failing(UpdateEventDto, { date })).toEqual([]);
    },
  );

  it.each(["ontem", "01/12/2099", "2099-13-45"])(
    "rejects %p instead of storing text that is not a date",
    (date) => {
      expect(failing(CreateEventDto, { ...base, date })).toContain("date");
      expect(failing(UpdateEventDto, { date })).toContain("date");
    },
  );

  it("an update may omit the date", () => {
    expect(failing(UpdateEventDto, { title: "Novo" })).toEqual([]);
  });
});
