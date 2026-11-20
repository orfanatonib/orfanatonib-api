import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import {
  areAllTracksPublishedAfter,
  isReadyForPublication,
  isTrackPublishable,
  isTrackPublished,
  isTrackReleased,
  publishableTracks,
  statusAfterPublication,
  workingPackageStatus,
  type PublicationRuleTrack,
} from "./content-publication-tracks.util";

const S = ContentStageStatus;
const stage = (status: ContentStageStatus, versioned = true) => ({
  status,
  required: true,
  currentVersionId: versioned ? "v1" : null,
});
const track = (
  audience: string,
  statuses: ContentStageStatus[],
  publishedAt: Date | null = null,
): PublicationRuleTrack => ({
  audience,
  publishedAt,
  stages: statuses.map((status) => stage(status)),
});

const approved = (audience: string, publishedAt: Date | null = null) =>
  track(
    audience,
    [S.APPROVED, S.APPROVED, S.APPROVED, S.APPROVED, S.APPROVED],
    publishedAt,
  );
const inReview = (audience: string) =>
  track(audience, [
    S.IN_REVIEW,
    S.IN_REVIEW,
    S.APPROVED,
    S.IN_REVIEW,
    S.IN_REVIEW,
  ]);
const inProduction = (audience: string) =>
  track(audience, [
    S.DRAFT,
    S.NOT_STARTED,
    S.NOT_STARTED,
    S.NOT_STARTED,
    S.NOT_STARTED,
  ]);

const IN_REVIEW = ContentPackageStatus.IN_REVIEW;

describe("situação do pacote quando a produção mexe em um item", () => {
  const IN_PROGRESS = ContentPackageStatus.IN_PROGRESS;
  it("produzir outra categoria NÃO tira do caminho uma categoria já aprovada ou em revisão", () => {
    expect(
      workingPackageStatus(
        [approved("BABY"), inProduction("TEEN")],
        IN_PROGRESS,
      ),
    ).toBe(ContentPackageStatus.READY_FOR_PUBLICATION);
    expect(
      workingPackageStatus(
        [inReview("BABY"), inProduction("TEEN")],
        IN_PROGRESS,
      ),
    ).toBe(ContentPackageStatus.IN_REVIEW);
  });
  it("categoria devolvida mantém o pacote em 'ajustes solicitados'; só produção => em produção", () => {
    const returned = track("BABY", [S.CHANGES_REQUESTED, S.APPROVED]);
    expect(
      workingPackageStatus([returned, inProduction("TEEN")], IN_PROGRESS),
    ).toBe(ContentPackageStatus.CHANGES_REQUESTED);
    expect(
      workingPackageStatus(
        [inProduction("BABY"), inProduction("TEEN")],
        IN_PROGRESS,
      ),
    ).toBe(IN_PROGRESS);
  });
  it("categoria já publicada não conta (o que falta é o resto)", () => {
    expect(
      workingPackageStatus(
        [approved("CHILD", new Date()), inProduction("BABY")],
        IN_PROGRESS,
      ),
    ).toBe(IN_PROGRESS);
  });
});

describe("publicação por categoria", () => {
  it("categoria só é publicável com todas as etapas obrigatórias aprovadas, com versão e ainda não publicada", () => {
    expect(isTrackPublishable(approved("BABY"), IN_REVIEW)).toBe(true);
    expect(isTrackPublishable(inReview("BABY"), IN_REVIEW)).toBe(false);
    expect(isTrackPublishable(inProduction("BABY"), IN_REVIEW)).toBe(false);
    const noVersion = {
      audience: "BABY",
      publishedAt: null,
      stages: [stage(S.APPROVED, false)],
    };
    expect(isTrackPublishable(noVersion, IN_REVIEW)).toBe(false);
    expect(
      isTrackPublishable(
        { audience: "BABY", publishedAt: null, stages: [] },
        IN_REVIEW,
      ),
    ).toBe(false);
    expect(isTrackPublishable(approved("BABY", new Date()), IN_REVIEW)).toBe(
      false,
    );
  });

  it("etapa não obrigatória não impede nem conta", () => {
    const optional = {
      audience: "BABY",
      publishedAt: null,
      stages: [
        stage(S.APPROVED),
        { status: S.NOT_STARTED, required: false, currentVersionId: null },
      ],
    };
    expect(isTrackPublishable(optional, IN_REVIEW)).toBe(true);
  });

  it("pacote antigo PUBLISHED: todas as categorias contam como publicadas (sem backfill)", () => {
    expect(
      isTrackPublished(approved("BABY"), ContentPackageStatus.PUBLISHED),
    ).toBe(true);
    expect(isTrackPublished(approved("BABY"), IN_REVIEW)).toBe(false);
    expect(isTrackPublished(approved("BABY", new Date()), IN_REVIEW)).toBe(
      true,
    );
  });

  it("liberada = alguma etapa na mão do revisor; produção e 'pronta' não contam", () => {
    expect(isTrackReleased(inReview("BABY"))).toBe(true);
    expect(isTrackReleased(approved("BABY"))).toBe(true);
    expect(isTrackReleased(track("BABY", [S.CHANGES_REQUESTED, S.DRAFT]))).toBe(
      true,
    );
    expect(isTrackReleased(inProduction("BABY"))).toBe(false);
    expect(
      isTrackReleased(
        track("BABY", [S.PRODUCER_APPROVED, S.PRODUCER_APPROVED]),
      ),
    ).toBe(false);
  });

  it("só o BABY liberado e aprovado: pacote pronto, mesmo com as outras categorias em produção", () => {
    const tracks = [
      approved("BABY"),
      inProduction("CHILD"),
      inProduction("TEEN"),
      inProduction("ADULT"),
    ];
    expect(
      publishableTracks(tracks, IN_REVIEW).map((item) => item.audience),
    ).toEqual(["BABY"]);
    expect(isReadyForPublication(tracks, IN_REVIEW)).toBe(true);
  });

  it("outra categoria ainda em revisão ou devolvida NÃO segura a publicação das aprovadas", () => {
    const returned = track("CHILD", [
      S.CHANGES_REQUESTED,
      S.APPROVED,
      S.APPROVED,
      S.APPROVED,
      S.APPROVED,
    ]);
    expect(
      isReadyForPublication(
        [approved("BABY"), inReview("CHILD"), inProduction("TEEN")],
        IN_REVIEW,
      ),
    ).toBe(true);
    expect(isReadyForPublication([approved("BABY"), returned], IN_REVIEW)).toBe(
      true,
    );
    expect(
      publishableTracks([approved("BABY"), inReview("CHILD")], IN_REVIEW).map(
        (item) => item.audience,
      ),
    ).toEqual(["BABY"]);
  });

  it("depois que o BABY está publicado, enviar só as crianças e aprová-las deixa o pacote pronto sem tocar no BABY", () => {
    const tracks = [
      approved("BABY", new Date()),
      approved("CHILD"),
      inProduction("TEEN"),
    ];
    expect(
      publishableTracks(tracks, IN_REVIEW).map((item) => item.audience),
    ).toEqual(["CHILD"]);
    expect(isReadyForPublication(tracks, IN_REVIEW)).toBe(true);
  });

  it("nada publicável (só categorias publicadas e em produção): não está pronto", () => {
    expect(
      isReadyForPublication(
        [approved("BABY", new Date()), inProduction("CHILD")],
        IN_REVIEW,
      ),
    ).toBe(false);
    expect(isReadyForPublication([], IN_REVIEW)).toBe(false);
  });

  it("o pacote só vira PUBLISHED quando todas as categorias estão na página", () => {
    const tracks = [
      approved("BABY", new Date()),
      approved("CHILD"),
      inProduction("TEEN"),
      inProduction("ADULT"),
    ];
    expect(areAllTracksPublishedAfter(tracks, IN_REVIEW, ["CHILD"])).toBe(
      false,
    );
    const rest = [
      approved("BABY", new Date()),
      approved("CHILD", new Date()),
      approved("TEEN"),
      approved("ADULT"),
    ];
    expect(areAllTracksPublishedAfter(rest, IN_REVIEW, ["TEEN", "ADULT"])).toBe(
      true,
    );
    expect(areAllTracksPublishedAfter([], IN_REVIEW, [])).toBe(false);
  });

  describe("situação do pacote depois de publicar", () => {
    const READY = ContentPackageStatus.READY_FOR_PUBLICATION;

    it("só o BABY publicado e o resto em produção: volta à produção (a página já tem o BABY)", () => {
      const tracks = [
        approved("BABY"),
        inProduction("CHILD"),
        inProduction("TEEN"),
        inProduction("ADULT"),
      ];
      expect(statusAfterPublication(tracks, READY, ["BABY"])).toBe(
        ContentPackageStatus.IN_PROGRESS,
      );
    });

    it("outra categoria em revisão ou devolvida: o pacote segue o caminho dela", () => {
      expect(
        statusAfterPublication([approved("BABY"), inReview("CHILD")], READY, [
          "BABY",
        ]),
      ).toBe(ContentPackageStatus.IN_REVIEW);
      const returned = track("CHILD", [
        S.CHANGES_REQUESTED,
        S.APPROVED,
        S.APPROVED,
        S.APPROVED,
        S.APPROVED,
      ]);
      expect(
        statusAfterPublication([approved("BABY"), returned], READY, ["BABY"]),
      ).toBe(ContentPackageStatus.CHANGES_REQUESTED);
    });

    it("outra categoria aprovada e ainda não publicada mantém o pacote pronto", () => {
      expect(
        statusAfterPublication([approved("BABY"), approved("CHILD")], READY, [
          "BABY",
        ]),
      ).toBe(READY);
    });

    it("todas as categorias na página: PUBLISHED", () => {
      const tracks = [
        approved("BABY", new Date()),
        approved("CHILD"),
        approved("TEEN"),
        approved("ADULT"),
      ];
      expect(
        statusAfterPublication(tracks, READY, ["CHILD", "TEEN", "ADULT"]),
      ).toBe(ContentPackageStatus.PUBLISHED);
    });
  });
});
