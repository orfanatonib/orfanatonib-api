import { ConflictException } from "@nestjs/common";
import { lessonCategoryProfile } from "../constants/lesson-category-profiles.constants";
import { AdminLessonPromptEntity } from "../entities/admin-lesson-prompt.entity";
import {
  LESSON_SHARED_QUALITY_RULES,
  LESSON_STAGE_QUALITY_RULES,
} from "../constants/lesson-quality.constants";
import { LESSON_TEMPLATES } from "../templates/lesson-templates";
import {
  LESSON_STAGE_ORDER,
  LessonCategory,
  LessonStageType,
} from "../enums/lesson.enums";
import { AdminLessonPromptService } from "./admin-lesson-prompt.service";
import { AdminLessonPromptRepository } from "../repositories/admin-lesson-prompt.repository";

describe("AdminLessonPromptService", () => {
  const records: AdminLessonPromptEntity[] = [];
  const repository = {
    findByAdminId: jest.fn((adminId: string) =>
      Promise.resolve(records.filter((item) => item.adminId === adminId)),
    ),
    findByAdminIdAndStage: jest.fn((adminId: string, stage: LessonStageType) =>
      Promise.resolve(
        records.find(
          (item) => item.adminId === adminId && item.stage === stage,
        ) ?? null,
      ),
    ),
    createPrompt: jest.fn((input: Partial<AdminLessonPromptEntity>) =>
      Object.assign(new AdminLessonPromptEntity(), input, {
        id: "prompt-1",
        lockVersion: 1,
      }),
    ),
    savePrompt: jest.fn((entity: AdminLessonPromptEntity) => {
      const index = records.findIndex((item) => item.id === entity.id);
      if (index >= 0) {
        entity.lockVersion += 1;
        records[index] = entity;
      } else records.push(entity);
      return Promise.resolve(entity);
    }),
    // Same contract as the SQL compare-and-swap: one row, only at that version.
    updatePromptWhereVersion: jest.fn(
      (id: string, expectedLockVersion: number, customPrompt: string) => {
        const record = records.find(
          (item) => item.id === id && item.lockVersion === expectedLockVersion,
        );
        if (!record) return Promise.resolve(false);
        record.customPrompt = customPrompt;
        record.lockVersion += 1;
        return Promise.resolve(true);
      },
    ),
  };
  const service = new AdminLessonPromptService(
    repository as unknown as AdminLessonPromptRepository,
  );

  beforeEach(() => {
    records.splice(0);
    jest.clearAllMocks();
  });

  it("entrega os cinco prompts-base para um administrador novo", async () => {
    const result = await service.list("admin-a");
    expect(result).toHaveLength(5);
    expect(
      result.every(
        (item) =>
          item.customPrompt === null &&
          item.effectivePrompt === item.basePrompt,
      ),
    ).toBe(true);
  });

  it.each(LESSON_STAGE_ORDER)(
    "preserva critérios gerais e específicos no prompt personalizado de %s",
    async (stage) => {
      const saved = await service.save(
        "admin-a",
        stage,
        "Use recursos disponíveis na sala.",
      );
      const effective = await service.effective("admin-a", stage);
      expect(effective).toBe(saved.effectivePrompt);
      expect(effective).toContain("Use recursos disponíveis na sala.");
      expect(effective).toContain("A orientação complementar não substitui");
      expect(saved.basePrompt).toContain(LESSON_STAGE_QUALITY_RULES[stage]);
      for (const rule of LESSON_SHARED_QUALITY_RULES) {
        expect(saved.basePrompt).toContain(rule);
        expect(effective).toContain(rule);
        expect(LESSON_TEMPLATES[stage].rules).toContain(rule);
      }
    },
  );

  it("isola a personalização por administrador e etapa", async () => {
    await service.save(
      "admin-a",
      LessonStageType.LESSON,
      "Minha orientação pessoal para a lição.",
    );
    const effective = await service.effective(
      "admin-a",
      LessonStageType.LESSON,
    );
    expect(effective).toContain("Minha orientação pessoal para a lição.");
    expect(effective).toContain("ESTRUTURA OBRIGATÓRIA");
    expect(
      await service.effective("admin-b", LessonStageType.LESSON),
    ).not.toContain("Minha orientação pessoal para a lição.");
    expect(
      (await service.list("admin-a")).find(
        (item) => item.stage === LessonStageType.LESSON_VISUALS,
      )?.customPrompt,
    ).toBeNull();
  });

  it("informa quando o administrador salvou a orientação, e nada para quem nunca personalizou", async () => {
    const [untouched] = await service.list("admin-1");
    expect(untouched.updatedAt).toBeNull();

    const savedAt = new Date("2026-11-11T15:30:00.000Z");
    records.push(
      Object.assign(new AdminLessonPromptEntity(), {
        id: "prompt-9",
        adminId: "admin-1",
        stage: LessonStageType.LESSON,
        customPrompt: "Use frases curtas e exemplos do dia a dia.",
        lockVersion: 1,
        updatedAt: savedAt,
      }),
    );

    const [mine] = await service.list("admin-1");
    const [theirs] = await service.list("admin-2");
    expect(mine.updatedAt).toBe(savedAt.toISOString());
    // A orientação é pessoal: outro administrador não a recebe.
    expect(theirs.updatedAt).toBeNull();
    expect(theirs.customPrompt).toBeNull();
  });

  it("entrega a lição no modelo 2026: dinâmica com marcações de ação, materiais e versículos", async () => {
    const prompt = await service.effective("admin-a", LessonStageType.LESSON);
    for (const section of [
      "PERSONAGENS",
      "MATERIAIS DE APOIO",
      "QUEBRA-GELO",
      "HISTÓRIA BÍBLICA",
      "APLICAÇÃO E APELO",
      "LIÇÃO (reviewQuestions)",
      "VERSÍCULOS (memoryVerse e verseOptions)",
    ])
      expect(prompt).toContain(section);
    expect(prompt).toContain("(Ação do Professor: …)");
    expect(prompt).toContain("aula completa, pronta para ministrar");
    expect(prompt).toContain("preferencialmente até 20 palavras");
    expect(prompt).toContain("reviewerNotes");
    expect(prompt).toContain("CONTEXTO DA VISITA");
    expect(prompt).not.toContain("Clubinho");
  });

  it("muda tom, tamanho e condutor conforme o público, sem trocar as etapas", async () => {
    const baby = await service.effective(
      "admin-a",
      LessonStageType.LESSON,
      LessonCategory.BABY,
    );
    const teen = await service.effective(
      "admin-a",
      LessonStageType.LESSON,
      LessonCategory.TEEN,
    );
    const adult = await service.effective(
      "admin-a",
      LessonStageType.LESSON,
      LessonCategory.ADULT,
    );
    expect(baby).toContain("0 a 2 anos");
    expect(baby).toContain("Ação do Voluntário");
    expect(baby).toContain("de 150 a 350 palavras");
    expect(teen).toContain("Ação do Líder");
    expect(teen).toContain("de 550 a 850 palavras");
    expect(adult).toContain("Ação do Condutor");
    expect(adult).toContain("de 650 a 1000 palavras");
    expect(new Set([baby, teen, adult]).size).toBe(3);
  });

  it.each(Object.values(LessonCategory))(
    "lista as cinco etapas com prompt próprio para %s",
    async (category) => {
      const result = await service.list("admin-a", category);
      expect(result.map((item) => item.stage)).toEqual([...LESSON_STAGE_ORDER]);
      for (const item of result)
        expect(item.basePrompt).toContain(
          lessonCategoryProfile(category).audience,
        );
    },
  );

  it.each([
    [LessonCategory.BABY, "colo", "bebê"],
    [LessonCategory.CHILD, "gincana", "estoura balão"],
    [LessonCategory.TEEN, "acampamento", "ADOLESCENTES DE 12 E 13 ANOS"],
    [LessonCategory.ADULT, "integração", "JOVENS DE 16 A 25 ANOS"],
  ])(
    "a brincadeira de %s usa a mecânica e as adaptações do público",
    async (category, mechanic, marker) => {
      const prompt = await service.effective(
        "admin-a",
        LessonStageType.STANDARD_GAME,
        category,
      );
      expect(prompt).toContain(mechanic);
      expect(prompt).toContain(marker);
      expect(prompt).toContain("PROIBIDO como mecânica principal");
      expect(prompt).toContain("compilado-01");
    },
  );

  it("a fixação do versículo preserva o texto aprovado e termina com recitação coletiva", async () => {
    const prompt = await service.effective(
      "admin-a",
      LessonStageType.VERSE_FIXATION,
      LessonCategory.ADULT,
    );
    expect(prompt).toContain("terminando com a recitação coletiva");
    expect(prompt).toContain("texto, referência e versão NVI");
    expect(prompt).toContain("COMO AVALIAR");
  });

  it("os visuais do versículo exigem cartão final da referência e paleta única", async () => {
    const prompt = await service.effective(
      "admin-a",
      LessonStageType.VERSE_VISUALS,
      LessonCategory.TEEN,
    );
    expect(prompt).toContain("última imagem exclusiva para a referência");
    expect(prompt).toContain("no máximo três cores");
  });

  it("rejeita atualização concorrente e restaura o padrão", async () => {
    const saved = await service.save(
      "admin-a",
      LessonStageType.STANDARD_GAME,
      "Prompt personalizado suficientemente longo.",
    );
    await expect(
      service.save(
        "admin-a",
        LessonStageType.STANDARD_GAME,
        "Outra versão suficientemente longa.",
        (saved.lockVersion ?? 1) - 1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    // A reset without the version the editor loaded would be a blind overwrite.
    await expect(
      service.reset("admin-a", LessonStageType.STANDARD_GAME),
    ).rejects.toBeInstanceOf(ConflictException);
    const reset = await service.reset(
      "admin-a",
      LessonStageType.STANDARD_GAME,
      saved.lockVersion ?? undefined,
    );
    expect(reset.customPrompt).toBeNull();
    // The row survives with a monotonic version, so a stale editor cannot win.
    expect(reset.lockVersion).toBe((saved.lockVersion ?? 0) + 1);
    await expect(
      service.save(
        "admin-a",
        LessonStageType.STANDARD_GAME,
        "Texto de uma sessão antiga, suficientemente longo.",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.save(
        "admin-a",
        LessonStageType.STANDARD_GAME,
        "Texto de uma sessão antiga, suficientemente longo.",
        saved.lockVersion ?? undefined,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      (
        await service.save(
          "admin-a",
          LessonStageType.STANDARD_GAME,
          "Texto da sessão atual, suficientemente longo.",
          reset.lockVersion ?? undefined,
        )
      ).customPrompt,
    ).toBe("Texto da sessão atual, suficientemente longo.");
    expect(reset.effectivePrompt).toBe(reset.basePrompt);
    expect(reset.basePrompt).toContain("CRIANÇAS DE 3 A 7 ANOS");
    expect(reset.basePrompt).toContain("CRIANÇAS DE 8 A 11 ANOS");
    expect(reset.basePrompt).toContain("todos participando quase o tempo todo");
    expect(reset.basePrompt).toContain("estoura balão");
  });

  it("trata como conflito a gravação condicional que não alterou nenhuma linha", async () => {
    const saved = await service.save(
      "admin-a",
      LessonStageType.LESSON,
      "Prompt personalizado suficientemente longo.",
    );
    // Another instance won the race between this read and its UPDATE.
    repository.updatePromptWhereVersion.mockResolvedValueOnce(false);
    await expect(
      service.save(
        "admin-a",
        LessonStageType.LESSON,
        "Outra versão suficientemente longa.",
        saved.lockVersion ?? undefined,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    repository.updatePromptWhereVersion.mockResolvedValueOnce(false);
    await expect(
      service.reset(
        "admin-a",
        LessonStageType.LESSON,
        saved.lockVersion ?? undefined,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("descreve o kit de recortes nos visuais da história, sem o contrato antigo de cenas", async () => {
    const prompt = await service.effective(
      "admin-a",
      LessonStageType.LESSON_VISUALS,
    );
    expect(prompt).toContain("KIT DE RECORTES");
    expect(prompt).toContain("kit-01");
    expect(prompt).toContain("storyEvidence");
    expect(prompt).not.toContain("sceneId");
    expect(prompt).not.toContain("STORY_SEQUENCE");
    expect(prompt).not.toContain(
      "Cada imagem deve representar um acontecimento",
    );
  });

  it("converte a criação concorrente (ER_DUP_ENTRY) em conflito 409", async () => {
    repository.savePrompt.mockRejectedValueOnce(
      Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" }),
    );
    await expect(
      service.save(
        "admin-a",
        LessonStageType.MANUAL_WORK,
        "Prompt personalizado suficientemente longo.",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    repository.savePrompt.mockRejectedValueOnce(new Error("Database down"));
    await expect(
      service.save(
        "admin-a",
        LessonStageType.MANUAL_WORK,
        "Prompt personalizado suficientemente longo.",
      ),
    ).rejects.toThrow("Database down");
  });

  it("dois salvamentos seguidos guardam só o complemento e a base aparece uma única vez", async () => {
    const first = await service.save(
      "admin-a",
      LessonStageType.MANUAL_WORK,
      "Primeiro complemento suficientemente longo.",
    );
    const second = await service.save(
      "admin-a",
      LessonStageType.MANUAL_WORK,
      "Segundo complemento suficientemente longo.",
      first.lockVersion ?? undefined,
    );
    expect(second.customPrompt).toBe(
      "Segundo complemento suficientemente longo.",
    );
    expect(second.effectivePrompt.split(second.basePrompt)).toHaveLength(2);
    expect(second.effectivePrompt).not.toContain("Primeiro complemento");
    expect(second.effectivePrompt).toContain(
      "ORIENTAÇÃO COMPLEMENTAR DO ADMINISTRADOR",
    );
  });
});
