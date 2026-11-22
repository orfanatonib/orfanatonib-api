import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { FeedbackCategory } from "../entity/feedback-category.enum";
import { CreateSiteFeedbackDto } from "./create-site-feedback.dto";
import { UpdateSiteFeedbackDto } from "./update-site-feedback.dto";

const valid = {
  name: "Maria",
  rating: 4,
  comment: "Gostei",
  category: FeedbackCategory.SUGGESTION,
};

const failing = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(dtoClass, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

describe("CreateSiteFeedbackDto", () => {
  it("aceita o corpo mínimo e o e-mail opcional", () => {
    expect(failing(CreateSiteFeedbackDto, valid)).toEqual([]);
    expect(
      failing(CreateSiteFeedbackDto, { ...valid, email: "a@b.com" }),
    ).toEqual([]);
  });

  it.each(["name", "comment"])(
    "recusa %s só com espaços (passava em IsNotEmpty)",
    (field) => {
      expect(
        failing(CreateSiteFeedbackDto, { ...valid, [field]: "   " }),
      ).toContain(field);
    },
  );

  it.each([0, 6, 4.5, "cinco"])("recusa a nota %p", (rating) => {
    expect(failing(CreateSiteFeedbackDto, { ...valid, rating })).toContain(
      "rating",
    );
  });

  it.each([1, 3, 5])("aceita a nota inteira %p", (rating) => {
    expect(failing(CreateSiteFeedbackDto, { ...valid, rating })).toEqual([]);
  });

  it("recusa nome e comentário acima do limite e categoria fora do enum", () => {
    expect(
      failing(CreateSiteFeedbackDto, {
        ...valid,
        name: "n".repeat(101),
        comment: "c".repeat(5001),
        category: "alien",
      }),
    ).toEqual(expect.arrayContaining(["name", "comment", "category"]));
  });
});

describe("UpdateSiteFeedbackDto", () => {
  it("aceita edição parcial e recusa o mesmo que o create", () => {
    expect(failing(UpdateSiteFeedbackDto, { comment: "Novo" })).toEqual([]);
    expect(failing(UpdateSiteFeedbackDto, {})).toEqual([]);
    expect(failing(UpdateSiteFeedbackDto, { rating: 2.5 })).toContain("rating");
    expect(failing(UpdateSiteFeedbackDto, { comment: "  " })).toContain(
      "comment",
    );
  });
});
