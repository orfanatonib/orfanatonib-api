import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { fakeStageContent } from "./fake-stage-content";
import { buildStageRequest } from "./stage-prompt.builder";
import { validateStageOutput } from "./stage-output.validator";
import { findSensitiveWords } from "./sensitive-words.constants";

describe("palavras sensíveis (abrigos e casas de apoio)", () => {
  it.each([
    ["O pai de Sansão ouviu o anjo", ["pai / pais"]],
    ["Nosso Pai que está nos céus", ["pai / pais"]],
    ["A MÃE de Sansão chorou", ["mãe / mães"]],
    ["Ninguém vai te abandonar", ["abandono / abandonar"]],
    ["Havia muita fome na terra", ["fome / faminto"]],
    ["Um órfão precisa de cuidado", ["órfão / orfandade"]],
    ["Eles sofreram maus-tratos", ["abuso / maus-tratos"]],
    ["Ele se sentiu rejeitado", ["rejeição / desamparo"]],
  ])("detecta em %s", (text, expected) => {
    expect(findSensitiveWords(text)).toEqual(expected);
  });

  it("não confunde com outras palavras (papel, país, pais de outro idioma não, orfanato, Paiva)", () => {
    expect(findSensitiveWords("O papel do país, no orfanato de Paiva")).toEqual(
      [],
    );
  });

  describe("validação do texto apresentado", () => {
    const lesson = (patch: (c: Record<string, unknown>) => void) => {
      const c = fakeStageContent(
        ContentStageType.LESSON,
        ContentAudience.CHILD,
        "X",
      );
      patch(c);
      return () =>
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.CHILD,
          c,
          null,
        );
    };

    it("recusa 'Pai' na história, no versículo e nas respostas, e diz onde", () => {
      expect(
        lesson((c) => {
          (c.story as Array<{ body: string }>)[0].body +=
            " Disse o pai: “Vá.” “Fale.”";
        }),
      ).toThrow(/palavra sensível \(pai \/ pais\) em story\[0\]\.body/);
      expect(
        lesson((c) => {
          c.memoryVerse = {
            text: "Ninguém vem ao Pai senão por mim",
            reference: "João 14.6",
          };
        }),
      ).toThrow(/memoryVerse\.text/);
    });

    it("não olha o material do voluntário (personagens, materiais, objetivos)", () => {
      expect(
        lesson((c) => {
          c.characters = ["Manoá — pai de Sansão"];
          c.supportMaterials = [
            "Cesto — representa a fome",
            "Pano — a fala do pai",
            "Pedra — a mãe",
          ];
          c.visitObjectives = "Mostrar que Deus cuida de quem passa fome.";
        }),
      ).not.toThrow();
    });

    it("vale para a brincadeira e para os cartões do versículo", () => {
      const game = fakeStageContent(
        ContentStageType.STANDARD_GAME,
        ContentAudience.CHILD,
        "X",
      );
      (game.steps as string[])[0] = "Entregue o balão para a mãe do grupo.";
      expect(() =>
        validateStageOutput(
          ContentStageType.STANDARD_GAME,
          ContentAudience.CHILD,
          game,
          null,
        ),
      ).toThrow(/steps\[0\]/);
    });
  });

  it("o prompt lista as palavras e a alternativa, em todas as etapas e públicos", () => {
    for (const audience of Object.values(ContentAudience))
      for (const stage of Object.values(ContentStageType)) {
        const text = buildStageRequest({
          stageType: stage,
          audience,
          theme: "T",
          biblicalReferences: "R",
          canonicalObjective: "O",
          canonicalNotes: null,
          upstream: {},
          previousVariants: [],
        }).instructions.join("\n");
        expect(text).toContain("PALAVRAS SENSÍVEIS");
        expect(text).toContain("abandono / abandonar");
        expect(text).toContain("fome / faminto");
      }
  });

  it("nova tentativa leva o motivo da recusa ao modelo", () => {
    const text = buildStageRequest({
      stageType: ContentStageType.LESSON,
      audience: ContentAudience.CHILD,
      theme: "T",
      biblicalReferences: "R",
      canonicalObjective: "O",
      canonicalNotes: null,
      upstream: {},
      previousVariants: [],
      retryFeedback:
        "story: poucas falas em discurso direto (1 de pelo menos 2)",
    }).instructions.join("\n");
    expect(text).toContain("CORREÇÃO");
    expect(text).toContain("poucas falas em discurso direto");
  });
});
