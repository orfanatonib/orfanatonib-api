import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { plannedImageSlots } from "../../services/get-stage-images.service";
import { buildStageDocument } from "../../export/stage-document.builder";
import { fakeStageContent } from "./fake-stage-content";
import { funSummaryImageSpecs } from "./image-prompts";
import { validateStageOutput } from "./stage-output.validator";
import { buildStageRequest } from "./stage-prompt.builder";
import {
  FIXATION_CALM_SAFETY,
  FIXATION_INSTRUCTIONS_SLOT,
  FIXATION_MOVEMENT_REQUIRED,
  FIXATION_MOVEMENT_SAFETY,
  FIXATION_PIECE_PRINT_RULE,
  FIXATION_PROFILES,
  FIXATION_REFERENCE_SLOT,
  isFixationPieceSlot,
} from "./verse-fixation.constants";

const F = ContentStageType.VERSE_FIXATION;
const AUDIENCES = Object.values(ContentAudience);
const UPSTREAM = {
  text: "Porque Deus tanto amou o mundo.",
  reference: "João 3.16",
};

const content = (audience: ContentAudience) =>
  fakeStageContent(F, audience, "T");
const run =
  (audience: ContentAudience, patch: (c: Record<string, unknown>) => void) =>
  () => {
    const c = content(audience);
    patch(c);
    return validateStageOutput(F, audience, c, UPSTREAM);
  };
const pieces = (c: Record<string, unknown>) =>
  c.pieces as Array<Record<string, unknown>>;

describe("fixação divertida do versículo: documento, instruções e peças", () => {
  it.each(AUDIENCES)("%s: o conteúdo simulado é válido", (audience) => {
    expect(run(audience, () => undefined)).not.toThrow();
  });

  it("as peças, em ordem, precisam reconstruir exatamente o versículo", () => {
    expect(
      run(ContentAudience.CHILD, (c) => {
        pieces(c)[0].text = "Porque Jesus tanto";
      }),
    ).toThrow(/não reconstroem o versículo/);
    expect(
      run(ContentAudience.CHILD, (c) => {
        pieces(c).reverse();
      }),
    ).toThrow(/pieces\[0\]\.id deve ser peca-01/);
  });

  it("uma peça não termina no meio da ideia (artigo, preposição, conjunção ou possessivo)", () => {
    expect(
      run(ContentAudience.CHILD, (c) => {
        pieces(c)[0].text = "Porque Deus tanto amou o";
        pieces(c)[1].text = "mundo.";
      }),
    ).toThrow(/pieces\[0\] termina em "o", no meio da ideia/);
    // A última peça fecha o versículo: não entra na regra.
    expect(
      validateStageOutput(
        F,
        ContentAudience.CHILD,
        {
          ...content(ContentAudience.CHILD),
          verse: { text: "Confie nele e", reference: UPSTREAM.reference },
          pieces: [
            { id: "peca-01", text: "Confie nele", figure: "" },
            { id: "peca-02", text: "e", figure: "" },
          ],
          steps: (content(ContentAudience.CHILD).steps as string[]).map(
            (step, i) => (i === 0 ? "Todos dizem: Confie nele e." : step),
          ),
        },
        { text: "Confie nele e", reference: UPSTREAM.reference },
      ),
    ).toBeDefined();
  });

  it("limita a quantidade de peças e as palavras por peça de cada público", () => {
    expect(
      run(ContentAudience.CHILD, (c) => {
        c.pieces = [{ id: "peca-01", text: UPSTREAM.text, figure: "" }];
      }),
    ).toThrow(/pieces: 1 fora do intervalo/);
    expect(
      run(ContentAudience.BABY, (c) => {
        c.pieces = [{ id: "peca-01", text: UPSTREAM.text, figure: "Sol" }];
      }),
    ).toThrow(/acima de 5; divida em mais peças/);
  });

  it("a peça da referência, o tema das peças e a dica do líder são obrigatórios", () => {
    expect(
      run(ContentAudience.TEEN, (c) => {
        c.referencePiece = { text: "João 3" };
      }),
    ).toThrow(/referencePiece\.text/);
    expect(
      run(ContentAudience.TEEN, (c) => {
        c.pieceTheme = "Cartões";
      }),
    ).toThrow(/pieceTheme/);
    expect(
      run(ContentAudience.TEEN, (c) => {
        c.leaderTip = " ";
      }),
    ).toThrow(/leaderTip/);
  });

  it("bebês: toda peça tem uma figura; as demais categorias podem deixar vazio", () => {
    const clear = (c: Record<string, unknown>) =>
      pieces(c).forEach((piece) => {
        piece.figure = "";
      });
    expect(run(ContentAudience.BABY, clear)).toThrow(
      /toda peça tem uma figura/,
    );
    expect(run(ContentAudience.ADULT, clear)).not.toThrow();
  });

  it("venda nos olhos: liberada para crianças e adolescentes, recusada para bebês e adultos", () => {
    const blindfold = (c: Record<string, unknown>) => {
      (c.steps as string[])[1] = "Um colega com venda é guiado até a peça.";
    };
    expect(run(ContentAudience.CHILD, blindfold)).not.toThrow();
    expect(run(ContentAudience.TEEN, blindfold)).not.toThrow();
    expect(run(ContentAudience.ADULT, blindfold)).toThrow(/risco ou exposição/);
    expect(run(ContentAudience.BABY, blindfold)).toThrow(/risco ou exposição/);
  });

  it.each(AUDIENCES)(
    "%s: o prompt pede o jogo com peças, no estilo e com a segurança do público",
    (audience) => {
      const f = FIXATION_PROFILES[audience];
      const prompt = buildStageRequest({
        stageType: F,
        audience,
        theme: "T",
        biblicalReferences: "João 3",
        canonicalObjective: "O",
        canonicalNotes: null,
        upstream: {},
        previousVariants: [],
      }).instructions.join("\n");
      expect(prompt).toContain("PEÇAS IMPRIMÍVEIS");
      expect(prompt).toContain(f.pieceStyle);
      expect(prompt).toContain(
        f.allowsMovement ? FIXATION_MOVEMENT_SAFETY : FIXATION_CALM_SAFETY,
      );
      expect(prompt).toContain(`no máximo ${f.pieceWords} palavras`);
      expect(prompt).toContain("UNIDADES DE SENTIDO");
      expect(prompt.includes(FIXATION_MOVEMENT_REQUIRED)).toBe(
        f.allowsMovement,
      );
    },
  );

  it.each(AUDIENCES)(
    "%s: uma folha de instruções em paisagem e uma imagem por peça, mais a da referência",
    (audience) => {
      const c = content(audience);
      const specs = funSummaryImageSpecs(F, c, audience);
      const chunks = pieces(c).map((piece) => String(piece.text));
      expect(specs.map((spec) => spec.slot)).toEqual([
        FIXATION_INSTRUCTIONS_SLOT,
        ...chunks.map((_, i) => `peca-0${i + 1}`),
        FIXATION_REFERENCE_SLOT,
      ]);
      expect(specs.length).toBeGreaterThanOrEqual(3);
      expect(specs.every((spec) => spec.size === "1536x1024")).toBe(true);
      expect(plannedImageSlots(F, c).map((item) => item.slot)).toEqual(
        specs.map((spec) => spec.slot),
      );

      const sheet = specs[0].instructions.join("\n");
      expect(sheet).toContain("FOLHA DE INSTRUÇÕES");
      expect(sheet).toContain(FIXATION_PROFILES[audience].infographicStyle);
      expect(sheet).toContain(`"${UPSTREAM.text}"`);
      expect(sheet).toContain(`"${UPSTREAM.reference}"`);
      expect(sheet).toContain(String(c.pieceTheme));
      for (const chunk of chunks) expect(sheet).toContain(`"${chunk}"`);

      specs.slice(1, -1).forEach((spec, i) => {
        const text = spec.instructions.join("\n");
        expect(text).toContain(`"${chunks[i]}"`);
        expect(text).toContain(String(c.pieceTheme));
        expect(text).toContain(FIXATION_PIECE_PRINT_RULE);
        expect(text).toContain("SOMENTE este trecho");
        expect(text.includes("FIGURA DA PEÇA")).toBe(
          audience === ContentAudience.BABY,
        );
        expect(text).not.toContain("DETALHE ILUSTRADO");
      });
      const reference = specs[specs.length - 1].instructions.join("\n");
      expect(reference).toContain(`"${UPSTREAM.reference}"`);
      expect(reference).toContain("SOMENTE a referência bíblica");
    },
  );

  it("as peças copiam a forma da primeira; a primeira, refeita sozinha, copia a segunda", () => {
    const specs = funSummaryImageSpecs(
      F,
      content(ContentAudience.CHILD),
      ContentAudience.CHILD,
    );
    expect(specs.map((spec) => spec.referenceSlot)).toEqual([
      undefined,
      "peca-02",
      ...specs.slice(2).map(() => "peca-01"),
    ]);
  });

  it("refazer: só as peças pedidas", () => {
    const c = content(ContentAudience.TEEN);
    expect(
      funSummaryImageSpecs(F, c, ContentAudience.TEEN, [
        "peca-02",
        FIXATION_REFERENCE_SLOT,
      ]).map((spec) => spec.slot),
    ).toEqual(["peca-02", FIXATION_REFERENCE_SLOT]);
  });

  it("reconhece os slots das peças (para não recortar a imagem)", () => {
    expect(isFixationPieceSlot("peca-03")).toBe(true);
    expect(isFixationPieceSlot(FIXATION_REFERENCE_SLOT)).toBe(true);
    expect(isFixationPieceSlot("compilado-01")).toBe(false);
    expect(isFixationPieceSlot("verso-01")).toBe(false);
  });

  it("o documento lista as peças na ordem, com a referência por último, e a dica do líder", () => {
    const text = JSON.stringify(
      buildStageDocument(F, content(ContentAudience.CHILD)),
    );
    expect(text).toContain("Peças do versículo (imprimir e recortar)");
    expect(text.indexOf("Porque Deus tanto")).toBeLessThan(
      text.lastIndexOf("João 3.16"),
    );
    expect(text).toContain("Dica para o líder");
  });
});
