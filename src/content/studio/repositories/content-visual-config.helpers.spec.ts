import { RuleException } from "src/common/exceptions";
import { LessonVisualFormat } from "../ai/generation/visual-art.constants";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  ContentVisualOrientation,
  ContentVisualStyle,
} from "../enums/content-visual.enums";
import { assertVisualConfig } from "./content-visual-config.helpers";

const input = (style = ContentVisualStyle.CUTE_CARTOON, withConfig = true) =>
  ({
    visualConfig: withConfig
      ? {
          quantity: 4,
          format: LessonVisualFormat.CUTOUT_KIT,
          style,
          orientation: ContentVisualOrientation.LANDSCAPE,
        }
      : null,
  }) as never;

describe("assertVisualConfig", () => {
  it("visuais da lição só geram depois das perguntas respondidas", () => {
    expect(() =>
      assertVisualConfig(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.CHILD,
        input(undefined, false),
      ),
    ).toThrow(RuleException);
  });

  it("o desenho precisa ser um dos oferecidos à categoria", () => {
    expect(() =>
      assertVisualConfig(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.CHILD,
        input(),
      ),
    ).not.toThrow();
    expect(() =>
      assertVisualConfig(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.ADULT,
        input(ContentVisualStyle.CUTE_CARTOON),
      ),
    ).toThrow(/categoria/);
    expect(() =>
      assertVisualConfig(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.ADULT,
        input(ContentVisualStyle.EDITORIAL_PAINTING),
      ),
    ).not.toThrow();
  });

  it("as demais etapas não exigem as escolhas", () => {
    for (const stage of [
      ContentStageType.LESSON,
      ContentStageType.VERSE_VISUALS,
      ContentStageType.VERSE_FIXATION,
      ContentStageType.STANDARD_GAME,
    ])
      expect(() =>
        assertVisualConfig(
          stage,
          ContentAudience.BABY,
          input(undefined, false),
        ),
      ).not.toThrow();
  });
});
