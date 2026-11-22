import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { markDependentStagesStale } from "./content-package-graph.helpers";
import { assertCategoryNotInReview } from "./content-package-rules.helpers";

const S = ContentStageStatus;
const TYPES = [
  ContentStageType.LESSON,
  ContentStageType.LESSON_VISUALS,
  ContentStageType.VERSE_VISUALS,
  ContentStageType.VERSE_FIXATION,
  ContentStageType.STANDARD_GAME,
];

/** Categoria com os cinco itens, cada um na situação informada (todos com versão). */
const track = (statuses: readonly ContentStageStatus[]): ContentStageEntity[] =>
  statuses.map(
    (status, index) =>
      ({
        id: `s${index + 1}`,
        stageType: TYPES[index],
        position: index + 1,
        dependencies: index === 0 ? [] : [ContentStageType.LESSON],
        status,
        currentVersionId: status === S.NOT_STARTED ? null : `v${index + 1}`,
      }) as unknown as ContentStageEntity,
  );

const regenerate = async (
  stages: ContentStageEntity[],
  item: number,
  allLater = true,
) => {
  const stageRepo = {
    save: jest.fn((stage: unknown) => Promise.resolve(stage)),
  };
  const jobRepo = { update: jest.fn() };
  await markDependentStagesStale(
    stageRepo as never,
    jobRepo as never,
    stages[item - 1],
    stages,
    allLater,
  );
  return stages.map((stage) => stage.status);
};

const APPROVED_UNTIL_4 = [
  S.PRODUCER_APPROVED,
  S.PRODUCER_APPROVED,
  S.PRODUCER_APPROVED,
  S.PRODUCER_APPROVED,
  S.DRAFT,
];

describe("gerar de novo um item já concluído", () => {
  it("item 4: só o item 5 volta a ficar desatualizado", async () => {
    expect(await regenerate(track(APPROVED_UNTIL_4), 4)).toEqual([
      S.PRODUCER_APPROVED,
      S.PRODUCER_APPROVED,
      S.PRODUCER_APPROVED,
      S.PRODUCER_APPROVED,
      S.STALE,
    ]);
  });

  it("item 2: os itens 3, 4 e 5 voltam a ficar desatualizados", async () => {
    expect(await regenerate(track(APPROVED_UNTIL_4), 2)).toEqual([
      S.PRODUCER_APPROVED,
      S.PRODUCER_APPROVED,
      S.STALE,
      S.STALE,
      S.STALE,
    ]);
  });

  it("item 1: todos os outros voltam a ficar desatualizados", async () => {
    expect(await regenerate(track(APPROVED_UNTIL_4), 1)).toEqual([
      S.PRODUCER_APPROVED,
      S.STALE,
      S.STALE,
      S.STALE,
      S.STALE,
    ]);
  });

  it("item seguinte ainda não começado continua não começado", async () => {
    const statuses = await regenerate(
      track([
        S.PRODUCER_APPROVED,
        S.DRAFT,
        S.NOT_STARTED,
        S.NOT_STARTED,
        S.NOT_STARTED,
      ]),
      1,
    );
    expect(statuses).toEqual([
      S.PRODUCER_APPROVED,
      S.STALE,
      S.NOT_STARTED,
      S.NOT_STARTED,
      S.NOT_STARTED,
    ]);
  });

  it("item devolvido pela revisão e gerado de novo não tira da revisão os itens seguintes", async () => {
    const statuses = await regenerate(
      track([S.APPROVED, S.DRAFT, S.APPROVED, S.IN_REVIEW, S.APPROVED]),
      2,
    );
    expect(statuses).toEqual([
      S.APPROVED,
      S.DRAFT,
      S.APPROVED,
      S.IN_REVIEW,
      S.APPROVED,
    ]);
  });

  it("edição manual continua valendo só para quem depende do item", async () => {
    expect(await regenerate(track(APPROVED_UNTIL_4), 4, false)).toEqual(
      APPROVED_UNTIL_4,
    );
    expect(
      (await regenerate(track(APPROVED_UNTIL_4), 1, false)).slice(1),
    ).toEqual([S.STALE, S.STALE, S.STALE, S.STALE]);
  });
});

describe("categoria que já foi para a revisão", () => {
  it("item concluído não pode ser gerado de novo enquanto houver item com a revisão", () => {
    for (const held of [S.IN_REVIEW, S.APPROVED]) {
      const stages = track([held, S.PRODUCER_APPROVED, held, held, held]);
      expect(() => assertCategoryNotInReview(stages[1], stages)).toThrow(
        /categoria está em revisão/,
      );
    }
  });

  it("item devolvido pelo revisor pode ser gerado de novo", () => {
    for (const returned of [S.CHANGES_REQUESTED, S.DRAFT, S.FAILED, S.STALE]) {
      const stages = track([
        S.APPROVED,
        returned,
        S.APPROVED,
        S.IN_REVIEW,
        S.APPROVED,
      ]);
      expect(() => assertCategoryNotInReview(stages[1], stages)).not.toThrow();
    }
  });

  it("categoria ainda na produção: item concluído pode ser gerado de novo", () => {
    const stages = track(APPROVED_UNTIL_4);
    expect(() => assertCategoryNotInReview(stages[3], stages)).not.toThrow();
  });
});
