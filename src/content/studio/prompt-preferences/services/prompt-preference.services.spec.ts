import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";
import type { ContentPromptPreferenceEntity } from "../../entities/content-prompt-preference.entity";
import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import type { ContentPromptPreferenceRepository } from "../../repositories/content-prompt-preference.repository";
import { ListPromptPreferencesService } from "./list-prompt-preferences.service";
import { ResetPromptPreferenceService } from "./reset-prompt-preference.service";
import { SavePromptPreferenceService } from "./save-prompt-preference.service";

const row = (
  over: Partial<ContentPromptPreferenceEntity> = {},
): ContentPromptPreferenceEntity =>
  ({
    userId: "u1",
    audience: ContentAudience.CHILD,
    stageType: ContentStageType.LESSON,
    customPrompt: "Use exemplos do dia a dia.",
    lockVersion: 2,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...over,
  }) as ContentPromptPreferenceEntity;

const repo = (
  over: Partial<
    Record<keyof ContentPromptPreferenceRepository, jest.Mock>
  > = {},
) =>
  ({
    findForUser: jest.fn(),
    write: jest.fn(),
    findActiveText: jest.fn(),
    ...over,
  }) as unknown as ContentPromptPreferenceRepository &
    Record<string, jest.Mock>;

describe("prompt preferences", () => {
  it("lista as 6 etapas na ordem de produção, com a orientação só onde existe", async () => {
    const r = repo({ findForUser: jest.fn().mockResolvedValue([row()]) });
    const items = await new ListPromptPreferencesService(r).execute(
      "u1",
      ContentAudience.CHILD,
    );
    expect(items.map((i) => i.stage)).toEqual(Object.values(ContentStageType));
    const lesson = items.find((i) => i.stage === "LESSON")!;
    expect(lesson).toMatchObject({
      customPrompt: "Use exemplos do dia a dia.",
      lockVersion: 2,
    });
    expect(lesson.effectivePrompt).toContain("PERSONALIZAÇÃO DO ADMINISTRADOR");
    const other = items.find((i) => i.stage === "ACTIVITY")!;
    expect(other).toMatchObject({
      customPrompt: null,
      lockVersion: null,
      updatedAt: null,
    });
    expect(other.effectivePrompt).toBe(other.basePrompt);
    expect(other.basePrompt.length).toBeGreaterThan(20);
  });

  it("salva com o texto aparado e devolve a etapa", async () => {
    const write = jest.fn().mockResolvedValue(row({ lockVersion: 3 }));
    const result = await new SavePromptPreferenceService(
      repo({ write }),
    ).execute("u1", {
      audience: ContentAudience.CHILD,
      stage: ContentStageType.LESSON,
      customPrompt: "  Use exemplos do dia a dia.  ",
      lockVersion: 2,
    });
    expect(write).toHaveBeenCalledWith(
      "u1",
      "CHILD",
      "LESSON",
      "Use exemplos do dia a dia.",
      2,
    );
    expect(result.lockVersion).toBe(3);
  });

  it("recusa texto curto ou sensível sem gravar (400)", async () => {
    const write = jest.fn();
    const service = new SavePromptPreferenceService(repo({ write }));
    const dto = {
      audience: ContentAudience.CHILD,
      stage: ContentStageType.LESSON,
    };
    await expect(
      service.execute("u1", { ...dto, customPrompt: "curto" }),
    ).rejects.toBeInstanceOf(RuleException);
    await expect(
      service.execute("u1", {
        ...dto,
        customPrompt: "Inclua o CPF e o endereço da criança no texto",
      }),
    ).rejects.toBeInstanceOf(RuleException);
    expect(write).not.toHaveBeenCalled();
  });

  it("propaga o conflito de versão (409) ao salvar e ao restaurar", async () => {
    const write = jest
      .fn()
      .mockRejectedValue(new ResourceConflictException("outra aba"));
    const base = {
      audience: ContentAudience.CHILD,
      stage: ContentStageType.LESSON,
      lockVersion: 1,
    };
    await expect(
      new SavePromptPreferenceService(repo({ write })).execute("u1", {
        ...base,
        customPrompt: "Use exemplos do dia a dia.",
      }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
    await expect(
      new ResetPromptPreferenceService(repo({ write })).execute("u1", base),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it("restaurar grava texto nulo e devolve o padrão oficial", async () => {
    const write = jest
      .fn()
      .mockResolvedValue(row({ customPrompt: null, lockVersion: 3 }));
    const result = await new ResetPromptPreferenceService(
      repo({ write }),
    ).execute("u1", {
      audience: ContentAudience.CHILD,
      stage: ContentStageType.LESSON,
      lockVersion: 2,
    });
    expect(write).toHaveBeenCalledWith("u1", "CHILD", "LESSON", null, 2);
    expect(result).toMatchObject({ customPrompt: null, lockVersion: 3 });
    expect(result.effectivePrompt).toBe(result.basePrompt);
  });
});
