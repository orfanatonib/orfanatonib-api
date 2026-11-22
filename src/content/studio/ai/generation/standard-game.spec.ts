import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { buildStageDocument } from "../../export/stage-document.builder";
import { plannedImageSlots } from "../../services/get-stage-images.service";
import { fakeStageContent } from "./fake-stage-content";
import {
  GAME_CALM_SAFETY,
  GAME_FUN_FIRST,
  GAME_KIT_PROFILES,
  GAME_MOVEMENT_SAFETY,
  GAME_PIECE_REFERENCE_RULE,
  gamePieceSlot,
  isGamePieceSlot,
} from "./game-kit.constants";
import { funSummaryImageSpecs } from "./image-prompts";
import { validateStageOutput } from "./stage-output.validator";
import { buildStageRequest } from "./stage-prompt.builder";
import { FIXATION_PIECE_PRINT_RULE } from "./verse-fixation.constants";

const G = ContentStageType.STANDARD_GAME;
const AUDIENCES = Object.values(ContentAudience);

const content = (audience: ContentAudience) =>
  fakeStageContent(G, audience, "T");
const run =
  (audience: ContentAudience, patch: (c: Record<string, unknown>) => void) =>
  () => {
    const c = content(audience);
    patch(c);
    return validateStageOutput(G, audience, c, null);
  };
const pieces = (c: Record<string, unknown>) =>
  c.pieces as Array<Record<string, unknown>>;

describe("brincadeira divertida: documento, folha de instruções e kit de peças", () => {
  it.each(AUDIENCES)("%s: o conteúdo simulado é válido", (audience) => {
    expect(run(audience, () => undefined)).not.toThrow();
  });

  it.each(AUDIENCES)(
    "%s: o prompt põe a diversão em primeiro lugar e pede o kit do público",
    (audience) => {
      const kit = GAME_KIT_PROFILES[audience];
      const prompt = buildStageRequest({
        stageType: G,
        audience,
        theme: "T",
        biblicalReferences: "João 3",
        canonicalObjective: "O",
        canonicalNotes: null,
        upstream: {},
        previousVariants: [],
      }).instructions.join("\n");
      expect(prompt).toContain(GAME_FUN_FIRST);
      expect(prompt).toContain("SURPRESA OBRIGATÓRIA");
      expect(prompt).toContain("KIT IMPRIMÍVEL");
      expect(prompt).toContain(kit.dynamic);
      expect(prompt).toContain(kit.kit);
      expect(prompt).toContain(
        `De ${kit.pieces.min} a ${kit.pieces.max} peças por brincadeira`,
      );
      expect(prompt).toContain(
        kit.allowsMovement ? GAME_MOVEMENT_SAFETY : GAME_CALM_SAFETY,
      );
      expect(prompt.includes("MOVIMENTO DE VERDADE")).toBe(kit.allowsMovement);
      expect(prompt.includes("ESPAÇO PEQUENO (obrigatório)")).toBe(
        !kit.allowsMovement,
      );
      expect(prompt.includes("DUAS BRINCADEIRAS DIFERENTES")).toBe(
        audience === ContentAudience.CHILD,
      );
      // A brincadeira não é a fixação: nada de versículo como mecânica.
      expect(prompt).toContain("NÃO é a fixação do versículo");
    },
  );

  it("movimento: só crianças e adolescentes", () => {
    expect(
      AUDIENCES.filter(
        (audience) => GAME_KIT_PROFILES[audience].allowsMovement,
      ),
    ).toEqual([ContentAudience.CHILD, ContentAudience.TEEN]);
  });

  it("o kit tem a quantidade de peças do público, ids em ordem, figura em todas e texto curto", () => {
    expect(
      run(ContentAudience.TEEN, (c) => {
        c.pieces = pieces(c).slice(0, 1);
      }),
    ).toThrow(/pieces: 1 fora do intervalo/);
    expect(
      run(ContentAudience.TEEN, (c) => {
        pieces(c).reverse();
      }),
    ).toThrow(/pieces\[0\]\.id deve ser peca-01/);
    expect(
      run(ContentAudience.TEEN, (c) => {
        pieces(c)[1].figure = " ";
      }),
    ).toThrow(/pieces\[1\]\.figure vazio/);
    expect(
      run(ContentAudience.TEEN, (c) => {
        pieces(c)[0].text = "Imite um sapo pulando alto";
      }),
    ).toThrow(/pieces\[0\]\.text: 5 palavras, acima de 3/);
    // Texto vazio é permitido quando a figura basta.
    expect(
      run(ContentAudience.TEEN, (c) => {
        pieces(c)[0].text = "";
      }),
    ).not.toThrow();
  });

  it("recusa peças repetidas, forma vaga e dica do líder vazia", () => {
    expect(
      run(ContentAudience.ADULT, (c) => {
        pieces(c)[1].text = pieces(c)[0].text;
        pieces(c)[1].figure = pieces(c)[0].figure;
      }),
    ).toThrow(/peças repetidas/);
    expect(
      run(ContentAudience.ADULT, (c) => {
        c.pieceTheme = "Cartas";
      }),
    ).toThrow(/pieceTheme/);
    expect(
      run(ContentAudience.ADULT, (c) => {
        c.leaderTip = "";
      }),
    ).toThrow(/leaderTip/);
  });

  it("crianças: a segunda brincadeira também precisa do seu kit", () => {
    expect(
      run(ContentAudience.CHILD, (c) => {
        (c.extraGames as Array<Record<string, unknown>>)[0].pieces = [];
      }),
    ).toThrow(/extraGames\[0\]\.pieces: 0 fora do intervalo/);
  });

  it.each(AUDIENCES)(
    "%s: uma folha em paisagem e uma imagem por peça em cada brincadeira; as peças copiam a primeira",
    (audience) => {
      const c = content(audience);
      const games = [
        c,
        ...((c.extraGames as Array<Record<string, unknown>>) ?? []),
      ];
      const specs = funSummaryImageSpecs(G, c, audience);
      const expected = games.flatMap((game, gameIndex) => [
        `compilado-0${gameIndex + 1}`,
        ...pieces(game).map((_, i) => gamePieceSlot(gameIndex, i)),
      ]);
      expect(games).toHaveLength(audience === ContentAudience.CHILD ? 2 : 1);
      expect(specs.map((spec) => spec.slot)).toEqual(expected);
      expect(specs.every((spec) => spec.size === "1536x1024")).toBe(true);
      expect(plannedImageSlots(G, c).map((item) => item.slot)).toEqual(
        expected,
      );

      games.forEach((game, gameIndex) => {
        const sheet = specs
          .find((spec) => spec.slot === `compilado-0${gameIndex + 1}`)
          ?.instructions.join("\n");
        expect(sheet).toContain("FOLHA DE INSTRUÇÕES DE UMA BRINCADEIRA");
        expect(sheet).toContain(`título "${String(game.name)}"`);
        expect(sheet).toContain('"PEÇAS DO JOGO"');
        expect(sheet).toContain(String(game.pieceTheme));
        expect(sheet).toContain(`"${String(game.leaderTip)}"`);
        expect(sheet).not.toContain("FAIXA DO VERSÍCULO");
        expect(sheet?.includes("ESPAÇO PEQUENO")).toBe(
          !GAME_KIT_PROFILES[audience].allowsMovement,
        );

        const first = gamePieceSlot(gameIndex, 0);
        pieces(game).forEach((piece, i) => {
          const spec = specs.find(
            (item) => item.slot === gamePieceSlot(gameIndex, i),
          );
          const text = spec?.instructions.join("\n") ?? "";
          expect(text).toContain(String(game.pieceTheme));
          expect(text).toContain(FIXATION_PIECE_PRINT_RULE);
          expect(text).toContain(`FIGURA DA PEÇA`);
          expect(text).toContain(String(piece.figure));
          expect(text).toContain(`"${String(piece.text)}"`);
          expect(spec?.referenceSlot).toBe(
            i === 0 ? gamePieceSlot(gameIndex, 1) : first,
          );
          expect(spec?.referenceRule).toBe(GAME_PIECE_REFERENCE_RULE);
        });
      });
    },
  );

  it("peça sem texto: o prompt proíbe qualquer letra", () => {
    const c = content(ContentAudience.TEEN);
    pieces(c)[0].text = "";
    const spec = funSummaryImageSpecs(G, c, ContentAudience.TEEN, ["peca-01"]);
    expect(spec).toHaveLength(1);
    expect(spec[0].instructions.join("\n")).toContain(
      "ESTA PEÇA NÃO TEM TEXTO",
    );
  });

  it("refazer: só os itens pedidos, inclusive da segunda brincadeira", () => {
    expect(
      funSummaryImageSpecs(
        G,
        content(ContentAudience.CHILD),
        ContentAudience.CHILD,
        ["jogo2-peca-02", "compilado-02"],
      ).map((spec) => spec.slot),
    ).toEqual(["compilado-02", "jogo2-peca-02"]);
  });

  it("brincadeira antiga, sem kit, continua com a imagem única em retrato", () => {
    const old = content(ContentAudience.TEEN);
    delete old.pieces;
    const specs = funSummaryImageSpecs(G, old, ContentAudience.TEEN);
    expect(specs.map((spec) => spec.slot)).toEqual(["compilado-01"]);
    expect(specs[0].size).toBe("1024x1536");
    expect(plannedImageSlots(G, old).map((item) => item.slot)).toEqual([
      "compilado-01",
    ]);
  });

  it("reconhece os slots das peças das duas brincadeiras", () => {
    expect(isGamePieceSlot("peca-03")).toBe(true);
    expect(isGamePieceSlot("jogo2-peca-01")).toBe(true);
    expect(isGamePieceSlot("compilado-02")).toBe(false);
    expect(isGamePieceSlot("peca-referencia")).toBe(false);
  });

  it("o documento lista o kit e a dica do líder de cada brincadeira", () => {
    const text = JSON.stringify(
      buildStageDocument(G, content(ContentAudience.CHILD)),
    );
    expect(text.split("Peças do jogo (imprimir e recortar)")).toHaveLength(3);
    expect(text.split("Dica para o líder")).toHaveLength(3);
    expect(text).toContain("Desafio 1 — Bola grande e sorridente");
    expect(text).toContain("Missão 1 — Bola grande e sorridente");
  });
});
