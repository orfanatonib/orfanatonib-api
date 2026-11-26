import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { VISIT_REPORT_LIMITS } from "../constants";
import { CreateVisitReportDto } from "./create-visit-report.dto";
import { UpdateVisitReportDto } from "./update-visit-report.dto";

const valid = {
  scheduleId: "6f1c3c62-0f6a-4f4b-9a3f-0b5f7f2a1d11",
  teamMembersPresent: 5,
  shelteredHeardMessage: 10,
  caretakersHeardMessage: 3,
  shelteredDecisions: 2,
  caretakersDecisions: 1,
};

const failing = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(dtoClass, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

const COUNTS = [
  "teamMembersPresent",
  "shelteredHeardMessage",
  "caretakersHeardMessage",
  "shelteredDecisions",
  "caretakersDecisions",
] as const;

describe("CreateVisitReportDto", () => {
  it("aceita o corpo completo, com e sem observação", () => {
    expect(failing(CreateVisitReportDto, valid)).toEqual([]);
    expect(
      failing(CreateVisitReportDto, { ...valid, observation: "Boa visita" }),
    ).toEqual([]);
  });

  it.each(COUNTS)(
    "%s: recusa negativo, fracionado e acima do teto",
    (field) => {
      for (const value of [-1, 2.5, VISIT_REPORT_LIMITS.countMax + 1]) {
        expect(
          failing(CreateVisitReportDto, { ...valid, [field]: value }),
        ).toContain(field);
      }
      expect(failing(CreateVisitReportDto, { ...valid, [field]: 0 })).toEqual(
        [],
      );
      expect(
        failing(CreateVisitReportDto, {
          ...valid,
          [field]: VISIT_REPORT_LIMITS.countMax,
        }),
      ).toEqual([]);
    },
  );

  it("recusa agenda que não é UUID e observação acima do limite", () => {
    expect(
      failing(CreateVisitReportDto, { ...valid, scheduleId: "x" }),
    ).toContain("scheduleId");
    expect(
      failing(CreateVisitReportDto, {
        ...valid,
        observation: "o".repeat(VISIT_REPORT_LIMITS.observationMax + 1),
      }),
    ).toContain("observation");
  });
});

describe("UpdateVisitReportDto", () => {
  it("aceita corpo parcial e vazio", () => {
    expect(failing(UpdateVisitReportDto, {})).toEqual([]);
    expect(failing(UpdateVisitReportDto, { teamMembersPresent: 3 })).toEqual(
      [],
    );
  });

  it("recusa o mesmo que o create", () => {
    expect(
      failing(UpdateVisitReportDto, { shelteredDecisions: 1.5 }),
    ).toContain("shelteredDecisions");
    expect(
      failing(UpdateVisitReportDto, {
        caretakersDecisions: VISIT_REPORT_LIMITS.countMax + 1,
      }),
    ).toContain("caretakersDecisions");
  });
});
