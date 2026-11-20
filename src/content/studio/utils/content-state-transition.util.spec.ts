import { ContentPackageStatus as P } from "../enums/content-package-status.enum";
import { ContentStageStatus as S } from "../enums/content-stage-status.enum";
import {
  canTransitionContentPackage,
  canTransitionContentStage,
  isContentStagePublishable,
} from "./content-state-transition.util";

/** A tabela esperada, escrita à mão: mudar uma transição é decisão explícita, não acidente. */
const PACKAGE: Record<P, P[]> = {
  [P.DRAFT]: [P.IN_PROGRESS, P.ARCHIVED],
  [P.IN_PROGRESS]: [P.PACKAGE_READY, P.IN_REVIEW, P.ARCHIVED],
  [P.PACKAGE_READY]: [P.IN_REVIEW, P.IN_PROGRESS, P.ARCHIVED],
  [P.IN_REVIEW]: [P.CHANGES_REQUESTED, P.READY_FOR_PUBLICATION, P.ARCHIVED],
  [P.CHANGES_REQUESTED]: [P.IN_PROGRESS, P.IN_REVIEW, P.ARCHIVED],
  [P.READY_FOR_PUBLICATION]: [
    P.PUBLISHING,
    P.IN_REVIEW,
    P.IN_PROGRESS,
    P.ARCHIVED,
  ],
  [P.PUBLISHING]: [P.PUBLISHED, P.READY_FOR_PUBLICATION],
  [P.PUBLISHED]: [P.ARCHIVED],
  [P.ARCHIVED]: [],
};

const STAGE: Record<S, S[]> = {
  [S.NOT_STARTED]: [S.GENERATING, S.DRAFT, S.NOT_REQUIRED],
  [S.GENERATING]: [S.DRAFT, S.FAILED, S.STALE],
  [S.DRAFT]: [S.GENERATING, S.DRAFT, S.PRODUCER_APPROVED, S.STALE],
  [S.PRODUCER_APPROVED]: [S.IN_REVIEW, S.DRAFT, S.STALE],
  [S.IN_REVIEW]: [S.APPROVED, S.CHANGES_REQUESTED, S.STALE],
  [S.APPROVED]: [S.DRAFT, S.STALE],
  [S.FAILED]: [S.GENERATING, S.DRAFT],
  [S.STALE]: [S.GENERATING, S.DRAFT],
  [S.CHANGES_REQUESTED]: [S.GENERATING, S.DRAFT],
  [S.NOT_REQUIRED]: [],
};

describe("transições do pacote", () => {
  const all = Object.values(P);
  it.each(all.flatMap((from) => all.map((to) => [from, to] as const)))(
    "%s → %s",
    (from, to) => {
      expect(canTransitionContentPackage(from, to)).toBe(
        PACKAGE[from].includes(to),
      );
    },
  );

  it("arquivado é terminal e todo estado (menos publicando) pode ser arquivado", () => {
    expect(PACKAGE[P.ARCHIVED]).toHaveLength(0);
    for (const from of all.filter(
      (s) => s !== P.PUBLISHING && s !== P.ARCHIVED,
    )) {
      expect(canTransitionContentPackage(from, P.ARCHIVED)).toBe(true);
    }
  });
});

describe("transições da etapa", () => {
  const all = Object.values(S);
  it.each(all.flatMap((from) => all.map((to) => [from, to] as const)))(
    "%s → %s",
    (from, to) => {
      expect(canTransitionContentStage(from, to)).toBe(
        STAGE[from].includes(to),
      );
    },
  );

  it("aprovação só vem da revisão; dispensada é terminal", () => {
    for (const from of all) {
      expect(canTransitionContentStage(from, S.APPROVED)).toBe(
        from === S.IN_REVIEW,
      );
    }
    expect(STAGE[S.NOT_REQUIRED]).toHaveLength(0);
  });
});

describe("isContentStagePublishable", () => {
  it("só etapa aprovada é publicável", () => {
    for (const status of Object.values(S)) {
      expect(isContentStagePublishable(status)).toBe(status === S.APPROVED);
    }
  });
});
