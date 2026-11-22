import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateShelterScheduleDto } from "./create-shelter-schedule.dto";
import { UpdateShelterScheduleDto } from "./update-shelter-schedule.dto";

const TEAM_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const failing = <T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(type, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

const validCreate = {
  visitNumber: 1,
  lessonContent: "Lição",
  teamId: TEAM_ID,
};

describe("CreateShelterScheduleDto", () => {
  it("accepts a minimal valid payload and the dates of the screen", () => {
    expect(failing(CreateShelterScheduleDto, validCreate)).toEqual([]);
    expect(
      failing(CreateShelterScheduleDto, {
        ...validCreate,
        visitDate: "2026-12-01",
        meetingDate: "2026-12-02T10:00:00.000Z",
      }),
    ).toEqual([]);
  });

  it.each(["visitDate", "meetingDate"])(
    "rejects text that is not a date on %s (it used to be stored as is)",
    (field) => {
      expect(
        failing(CreateShelterScheduleDto, { ...validCreate, [field]: "ontem" }),
      ).toContain(field);
    },
  );

  it.each(["visitDate", "meetingDate"])(
    "treats an empty %s as no value (the screen sends it to leave the date blank)",
    (field) => {
      expect(
        failing(CreateShelterScheduleDto, { ...validCreate, [field]: "" }),
      ).toEqual([]);
    },
  );

  it("requires lesson content and a bounded meeting room", () => {
    expect(
      failing(CreateShelterScheduleDto, { ...validCreate, lessonContent: "" }),
    ).toContain("lessonContent");
    expect(
      failing(CreateShelterScheduleDto, {
        ...validCreate,
        meetingRoom: "s".repeat(256),
      }),
    ).toContain("meetingRoom");
  });
});

describe("UpdateShelterScheduleDto", () => {
  it("accepts an empty payload (partial update)", () => {
    expect(failing(UpdateShelterScheduleDto, {})).toEqual([]);
  });

  it("rejects an invalid date but lets the screen blank a date", () => {
    expect(failing(UpdateShelterScheduleDto, { visitDate: "ontem" })).toContain(
      "visitDate",
    );
    expect(failing(UpdateShelterScheduleDto, { visitDate: "" })).toEqual([]);
  });

  it.each([null, ""])(
    "rejects %p as lesson content: the column is NOT NULL",
    (value) => {
      expect(
        failing(UpdateShelterScheduleDto, { lessonContent: value }),
      ).toContain("lessonContent");
    },
  );

  it("rejects a meeting room beyond the varchar(255) column", () => {
    expect(
      failing(UpdateShelterScheduleDto, { meetingRoom: "s".repeat(256) }),
    ).toContain("meetingRoom");
  });
});
