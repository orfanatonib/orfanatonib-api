import { LessonCategory, LessonStageType } from "../enums/lesson.enums";
import { getLessonTemplate } from "../templates/lesson-template-resolver";
import {
  LESSON_CATEGORY_PROFILES,
  lessonCategoryProfile,
} from "./lesson-category-profiles.constants";
import {
  lessonStageBasePrompt,
  ORFANATO_STAGES,
} from "./lesson-orfanato-prompts.constants";

const CATEGORIES = Object.values(LessonCategory);

describe("perfis de público do Estúdio Orfanato", () => {
  it("cobre exatamente as quatro categorias", () => {
    expect(CATEGORIES.sort()).toEqual(["ADULT", "BABY", "CHILD", "TEEN"]);
    expect(Object.keys(LESSON_CATEGORY_PROFILES).sort()).toEqual(
      [...CATEGORIES].sort(),
    );
  });

  it("usa CHILD quando a categoria é desconhecida", () => {
    expect(lessonCategoryProfile(undefined).slug).toBe("criancas");
    expect(lessonCategoryProfile(null).slug).toBe("criancas");
  });

  it.each(CATEGORIES)("%s tem faixas coerentes", (category) => {
    const p = lessonCategoryProfile(category);
    expect(p.storyWords.min).toBeLessThan(p.storyWords.max);
    expect(p.questions.min).toBeLessThanOrEqual(p.questions.max);
    expect(p.supportMaterials.min).toBeLessThanOrEqual(p.supportMaterials.max);
    expect(p.gameMinutes.min).toBeLessThan(p.gameMinutes.max);
    expect(p.slug).toMatch(/^[a-z]+$/);
  });

  it("o tamanho da história cresce de Baby para Adultos", () => {
    const max = (c: LessonCategory) => lessonCategoryProfile(c).storyWords.max;
    expect(max(LessonCategory.BABY)).toBeLessThan(max(LessonCategory.CHILD));
    expect(max(LessonCategory.CHILD)).toBeLessThan(max(LessonCategory.TEEN));
    expect(max(LessonCategory.TEEN)).toBeLessThan(max(LessonCategory.ADULT));
  });
});

describe("prompts-base das cinco etapas", () => {
  it.each(CATEGORIES)("%s gera prompt não vazio e sem Clubinho", (category) => {
    for (const stage of ORFANATO_STAGES) {
      const prompt = lessonStageBasePrompt(stage, category);
      expect(prompt.length).toBeGreaterThan(500);
      expect(prompt).not.toContain("Clubinho");
      expect(prompt).not.toContain("5 a 11 anos");
    }
  });

  it("só a lição, a brincadeira e a fixação carregam o contexto de abrigo completo", () => {
    for (const stage of [
      LessonStageType.LESSON,
      LessonStageType.STANDARD_GAME,
      LessonStageType.VERSE_FIXATION,
    ])
      expect(lessonStageBasePrompt(stage, LessonCategory.TEEN)).toContain(
        'Nunca chame o grupo de "órfãos"',
      );
  });

  it("nunca pede que alguém exponha a história familiar", () => {
    for (const category of CATEGORIES)
      expect(lessonStageBasePrompt(LessonStageType.LESSON, category)).toContain(
        "Toda participação é voluntária",
      );
  });

  it("diferencia kit de recortes e cenas completas nos visuais da lição", () => {
    const kit = lessonStageBasePrompt(
      LessonStageType.LESSON_VISUALS,
      LessonCategory.CHILD,
      true,
    );
    const scenes = lessonStageBasePrompt(
      LessonStageType.LESSON_VISUALS,
      LessonCategory.CHILD,
      false,
    );
    expect(kit).toContain("KIT DE RECORTES");
    expect(kit).toContain("kit-01");
    expect(scenes).toContain("CENAS COMPLETAS");
    expect(scenes).toContain("visual-01");
    expect(scenes).not.toContain("kit-01");
  });

  it("a brincadeira de adultos e adolescentes não é gincana infantil", () => {
    const adult = lessonStageBasePrompt(
      LessonStageType.STANDARD_GAME,
      LessonCategory.ADULT,
    );
    expect(adult).toContain("versão sentada ou de baixo esforço");
    expect(adult).not.toContain("estoura balão");
  });
});

describe("resolvedor de template por público", () => {
  it.each(CATEGORIES)("%s recebe a chave e a regra do público", (category) => {
    const profile = lessonCategoryProfile(category);
    for (const stage of ORFANATO_STAGES) {
      const template = getLessonTemplate(stage, category);
      expect(template.key.endsWith(`.${profile.slug}`)).toBe(true);
      expect(template.rules.at(-1)).toContain(profile.ageRange);
    }
  });

  it("troca o rótulo das adaptações pelas idades do público", () => {
    const template = getLessonTemplate(
      LessonStageType.STANDARD_GAME,
      LessonCategory.TEEN,
    );
    expect(template.exactStructure).toContain(
      "ADAPTAÇÕES: ADOLESCENTES DE 12 E 13 ANOS E ADOLESCENTES DE 14 E 15 ANOS",
    );
  });

  it("o contrato da lição segue o modelo 2026", () => {
    const { exactStructure } = getLessonTemplate(
      LessonStageType.LESSON,
      LessonCategory.ADULT,
    );
    expect(exactStructure).toEqual([
      "LIÇÃO E TÍTULO",
      "TEXTO/REFERÊNCIA BÍBLICA",
      "PERSONAGENS",
      "MATERIAIS DE APOIO",
      "QUEBRA-GELO",
      "HISTÓRIA BÍBLICA",
      "APLICAÇÃO E APELO",
      "LIÇÃO (PERGUNTAS E RESPOSTAS)",
      "VERSÍCULOS",
    ]);
  });
});
