import { Logger, UnprocessableEntityException } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  StudioExportFormat,
  StudioExportService,
  exportFileName,
} from "./studio-export.service";

const version = (over: object = {}) => ({
  id: "v1",
  contentChecksum: "abc",
  structuredContent: { title: "Deus cuida" },
  contentDocument: null,
  ...over,
});
const stage = (
  id: string,
  type: ContentStageType,
  position: number,
  currentVersion: object | null,
) => ({ id, stageType: type, position, currentVersion });
const track = (
  audience: ContentAudience,
  stages: object[],
  minimumAge = 3,
) => ({
  id: `t-${audience}`,
  audience,
  audienceName: audience === ContentAudience.CHILD ? "Crianças" : "Baby",
  minimumAge,
  maximumAge: minimumAge + 8,
  stages,
});
const pkg = (tracks: object[]) => ({
  id: "p1",
  theme: "Esperança & Fé",
  biblicalReferences: "Salmos 23",
  tracks,
});

function setup(
  graph: unknown,
  assetRows: object[] = [],
  imageBytes = Buffer.from("PNGBYTES"),
) {
  const repo = { findByIdWithGraph: jest.fn().mockResolvedValue(graph) };
  const docx = { build: jest.fn().mockResolvedValue(Buffer.from("PKdocx")) };
  const pdf = {
    convertDocxToPdf: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.7 x")),
  };
  const assets = {
    listForVersion: jest.fn().mockResolvedValue(assetRows),
    findStagePdf: jest.fn().mockResolvedValue(null),
    replaceStagePdf: jest.fn().mockResolvedValue([]),
  };
  const s3 = {
    getEnvironment: jest.fn().mockReturnValue("test"),
    buildUrl: jest.fn((key: string) => `https://bucket/${key}`),
    downloadOwned: jest.fn().mockResolvedValue(imageBytes),
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteKey: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repo,
    docx,
    pdf,
    assets,
    s3,
    svc: new StudioExportService(
      repo as never,
      docx as never,
      pdf as never,
      assets as never,
      s3 as never,
    ),
  };
}

describe("exportFileName", () => {
  it("sem acento, espaço nem símbolo", () => {
    expect(
      exportFileName(["Esperança & Fé", "Crianças"], StudioExportFormat.PDF),
    ).toBe("esperanca-fe-criancas.pdf");
    expect(exportFileName(["***"], StudioExportFormat.DOCX)).toBe(
      "material-para-visita.docx",
    );
  });
});

describe("StudioExportService", () => {
  const lesson = stage("s1", ContentStageType.LESSON, 2, version());
  const base = stage(
    "s0",
    ContentStageType.LESSON_VISUALS,
    1,
    version({ id: "v0", structuredContent: { title: "Base" } }),
  );

  it("faixa: etapas na ordem da posição e título legível; PDF usa a chave de cache das versões", async () => {
    const { svc, docx, pdf } = setup(
      pkg([track(ContentAudience.CHILD, [lesson, base])]),
    );
    const file = await svc.exportTrack(
      "p1",
      ContentAudience.CHILD,
      StudioExportFormat.PDF,
    );
    const [meta, sections] = docx.build.mock.calls[0];
    // "Visuais da lição" não tem documento de texto: sem imagens geradas, a etapa não entra no arquivo.
    expect(sections.map((s: { title: string }) => s.title)).toEqual(["LIÇÃO"]);
    expect(meta.audienceLabel).toBe("Crianças · 3 a 11 anos");
    expect(pdf.convertDocxToPdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(file).toMatchObject({
      fileName: "esperanca-fe-criancas.pdf",
      contentType: "application/pdf",
    });
  });

  it("DOCX não passa pelo conversor", async () => {
    const { svc, pdf } = setup(pkg([track(ContentAudience.CHILD, [lesson])]));
    const file = await svc.exportTrack(
      "p1",
      ContentAudience.CHILD,
      StudioExportFormat.DOCX,
    );
    expect(pdf.convertDocxToPdf).not.toHaveBeenCalled();
    expect(file.fileName.endsWith(".docx")).toBe(true);
  });

  it("o documento editado à mão vence o montado dos campos", async () => {
    const edited = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "EDITADO" }] },
      ],
    };
    const { svc, docx } = setup(
      pkg([
        track(ContentAudience.CHILD, [
          stage(
            "s1",
            ContentStageType.LESSON,
            1,
            version({ contentDocument: edited }),
          ),
        ]),
      ]),
    );
    await svc.exportTrack("p1", ContentAudience.CHILD, StudioExportFormat.DOCX);
    expect(docx.build.mock.calls[0][1][0].document).toBe(edited);
  });

  it("material completo: títulos levam a faixa quando há mais de uma", async () => {
    const { svc, docx } = setup(
      pkg([
        track(ContentAudience.CHILD, [lesson]),
        track(
          ContentAudience.BABY,
          [stage("b1", ContentStageType.LESSON, 1, version({ id: "vb" }))],
          0,
        ),
      ]),
    );
    await svc.exportPackage("p1", StudioExportFormat.DOCX);
    const titles = docx.build.mock.calls[0][1].map(
      (s: { title: string }) => s.title,
    );
    expect(titles).toEqual(["BABY · LIÇÃO", "CRIANÇAS · LIÇÃO"]);
  });

  it("etapa avulsa", async () => {
    const { svc, docx } = setup(pkg([track(ContentAudience.CHILD, [lesson])]));
    await svc.exportStage("p1", "s1", StudioExportFormat.DOCX);
    expect(docx.build.mock.calls[0][1]).toHaveLength(1);
  });

  it("sem conteúdo algum: 422 explicando; inexistentes: 404", async () => {
    const empty = setup(
      pkg([
        track(ContentAudience.CHILD, [
          stage("s1", ContentStageType.LESSON, 1, null),
        ]),
      ]),
    );
    await expect(
      empty.svc.exportTrack(
        "p1",
        ContentAudience.CHILD,
        StudioExportFormat.PDF,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    const ok = setup(pkg([track(ContentAudience.CHILD, [lesson])]));
    await expect(
      ok.svc.exportStage("p1", "nope", StudioExportFormat.PDF),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    await expect(
      ok.svc.exportTrack("p1", ContentAudience.ADULT, StudioExportFormat.PDF),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    const none = setup(null);
    await expect(
      none.svc.exportPackage("x", StudioExportFormat.PDF),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe("StudioExportService.stageDocumentFor", () => {
  it("devolve o documento editado (edited=true) ou o montado dos campos (edited=false), e vazio se não há versão", async () => {
    const edited = { type: "doc", content: [{ type: "paragraph" }] };
    const withEdit = setup(
      pkg([
        track(ContentAudience.CHILD, [
          stage(
            "s1",
            ContentStageType.LESSON,
            1,
            version({ contentDocument: edited }),
          ),
        ]),
      ]),
    );
    await expect(
      withEdit.svc.stageDocumentFor("p1", "s1"),
    ).resolves.toMatchObject({
      edited: true,
      document: edited,
      versionId: "v1",
    });

    const derived = setup(
      pkg([
        track(ContentAudience.CHILD, [
          stage("s1", ContentStageType.LESSON, 1, version()),
        ]),
      ]),
    );
    const result = await derived.svc.stageDocumentFor("p1", "s1");
    expect(result.edited).toBe(false);
    expect(result.document.content.length).toBeGreaterThan(0);

    const none = setup(
      pkg([
        track(ContentAudience.CHILD, [
          stage("s1", ContentStageType.LESSON, 1, null),
        ]),
      ]),
    );
    await expect(none.svc.stageDocumentFor("p1", "s1")).resolves.toMatchObject({
      edited: false,
      versionId: null,
      document: { content: [] },
    });
    await expect(
      none.svc.stageDocumentFor("p1", "nope"),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  describe("Visuais da lição: só imagens, uma por página", () => {
    // PNG 1x1 válido (o tamanho real vem do arquivo).
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const visuals = (orientation: string) =>
      stage(
        "sv",
        ContentStageType.LESSON_VISUALS,
        2,
        version({
          id: "vv",
          structuredContent: {
            items: [{ id: "visual-01" }, { id: "visual-02" }],
            visualConfig: { orientation },
          },
        }),
      );
    const rows = [
      { slot: "visual-02", storageKey: "k/2.png", checksum: "bb" },
      { slot: "visual-01", storageKey: "k/1.png", checksum: "aa" },
    ];

    it("cada imagem vira uma página, na ordem do plano, na orientação escolhida", async () => {
      const { svc, docx } = setup(
        pkg([track(ContentAudience.CHILD, [visuals("PORTRAIT")])]),
        rows,
        png,
      );
      await svc.exportStage("p1", "sv", StudioExportFormat.DOCX);
      const sections = docx.build.mock.calls[0][1];
      expect(sections).toHaveLength(1);
      expect(sections[0].imagePages.orientation).toBe("PORTRAIT");
      expect(sections[0].imagePages.images).toHaveLength(2);
      expect(sections[0].imagePages.images[0]).toMatchObject({
        width: 1,
        height: 1,
      });
      // nenhum documento de texto
      expect(sections[0].document.content).toEqual([]);
    });

    it("paisagem é o padrão, e refazer uma imagem muda a chave de cache do PDF", async () => {
      const first = setup(
        pkg([track(ContentAudience.CHILD, [visuals("LANDSCAPE")])]),
        rows,
        png,
      );
      await first.svc.exportStage("p1", "sv", StudioExportFormat.PDF);
      expect(first.docx.build.mock.calls[0][1][0].imagePages.orientation).toBe(
        "LANDSCAPE",
      );
      const keyA = first.pdf.convertDocxToPdf.mock.calls[0][1];

      const changed = setup(
        pkg([track(ContentAudience.CHILD, [visuals("LANDSCAPE")])]),
        [{ ...rows[0], checksum: "novo" }, rows[1]],
        png,
      );
      await changed.svc.exportStage("p1", "sv", StudioExportFormat.PDF);
      expect(changed.pdf.convertDocxToPdf.mock.calls[0][1]).not.toBe(keyA);
    });

    it("sem nenhuma imagem gerada não há o que exportar", async () => {
      const { svc } = setup(
        pkg([track(ContentAudience.CHILD, [visuals("LANDSCAPE")])]),
        [],
        png,
      );
      await expect(
        svc.exportStage("p1", "sv", StudioExportFormat.PDF),
      ).rejects.toThrow(/Ainda não há conteúdo/);
    });
  });
});

describe("PDF da etapa guardado (a revisão lê um arquivo pronto, não monta na hora)", () => {
  const lesson = stage("s1", ContentStageType.LESSON, 1, version());
  const graph = () => pkg([track(ContentAudience.CHILD, [lesson])]);

  it("1ª vez: monta o PDF e o guarda com a chave de conteúdo (a mesma do conversor)", async () => {
    const { svc, docx, pdf, assets, s3 } = setup(graph());

    const file = await svc.exportStage("p1", "s1", StudioExportFormat.PDF);

    expect(file.buffer.toString()).toContain("%PDF");
    expect(docx.build).toHaveBeenCalledTimes(1);
    const cacheKey = pdf.convertDocxToPdf.mock.calls[0][1] as string;
    expect(assets.findStagePdf).toHaveBeenCalledWith("v1", cacheKey);
    expect(s3.putObject).toHaveBeenCalledWith(
      expect.stringContaining("/content-studio/p1/s1/v1/stage-pdf-"),
      expect.any(Buffer),
      "application/pdf",
    );
    expect(assets.replaceStagePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: "p1",
        stageId: "s1",
        versionId: "v1",
        slot: "stage-pdf",
        checksum: cacheKey,
      }),
    );
  });

  it("já guardado: serve o arquivo e NÃO monta documento nem chama o LibreOffice", async () => {
    const first = setup(graph());
    await first.svc.exportStage("p1", "s1", StudioExportFormat.PDF);
    const key = first.assets.findStagePdf.mock.calls[0][1] as string;

    const { svc, docx, pdf, assets, s3 } = setup(graph());
    assets.findStagePdf.mockResolvedValue({
      storageKey: "test/x.pdf",
      checksum: key,
    });
    s3.downloadOwned.mockResolvedValue(Buffer.from("%PDF-GUARDADO"));

    const file = await svc.exportStage("p1", "s1", StudioExportFormat.PDF);

    expect(file.buffer.toString()).toBe("%PDF-GUARDADO");
    expect(file.fileName).toBe("esperanca-fe-criancas-licao.pdf");
    expect(docx.build).not.toHaveBeenCalled();
    expect(pdf.convertDocxToPdf).not.toHaveBeenCalled();
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it("nova versão ou novo conteúdo => outra chave (nunca serve PDF velho)", async () => {
    const a = setup(graph());
    await a.svc.exportStage("p1", "s1", StudioExportFormat.PDF);
    const other = stage(
      "s1",
      ContentStageType.LESSON,
      1,
      version({ id: "v2", contentChecksum: "zzz" }),
    );
    const b = setup(pkg([track(ContentAudience.CHILD, [other])]));
    await b.svc.exportStage("p1", "s1", StudioExportFormat.PDF);
    expect(a.assets.findStagePdf.mock.calls[0][1]).not.toBe(
      b.assets.findStagePdf.mock.calls[0][1],
    );
    expect(b.assets.findStagePdf.mock.calls[0][0]).toBe("v2");
  });

  it("DOCX nunca é guardado nem lido do arquivo", async () => {
    const { svc, assets, s3 } = setup(graph());
    await svc.exportStage("p1", "s1", StudioExportFormat.DOCX);
    expect(assets.findStagePdf).not.toHaveBeenCalled();
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it("falha ao guardar não derruba a exportação: o PDF sai e a próxima abertura tenta de novo", async () => {
    const { svc, s3 } = setup(graph());
    s3.putObject.mockRejectedValue(new Error("s3 fora"));
    const file = await svc.exportStage("p1", "s1", StudioExportFormat.PDF);
    expect(file.buffer.toString()).toContain("%PDF");
  });

  it("arquivo guardado ilegível: monta de novo", async () => {
    const { svc, docx, assets, s3 } = setup(graph());
    assets.findStagePdf.mockResolvedValue({ storageKey: "test/x.pdf" });
    s3.downloadOwned.mockRejectedValue(new Error("404"));
    const file = await svc.exportStage("p1", "s1", StudioExportFormat.PDF);
    expect(docx.build).toHaveBeenCalledTimes(1);
    expect(file.buffer.toString()).toContain("%PDF");
  });

  it("troca de PDF apaga o antigo do bucket, sem falhar se não conseguir apagar", async () => {
    const { svc, assets, s3 } = setup(graph());
    assets.replaceStagePdf.mockResolvedValue(["test/antigo.pdf"]);
    s3.deleteKey.mockRejectedValue(new Error("sem permissão"));
    await expect(
      svc.exportStage("p1", "s1", StudioExportFormat.PDF),
    ).resolves.toBeDefined();
    expect(s3.deleteKey).toHaveBeenCalledWith("test/antigo.pdf");
  });

  it("pré-geração: gera uma etapa por vez e uma falha não impede as seguintes", async () => {
    const two = stage(
      "s2",
      ContentStageType.LESSON_VISUALS,
      2,
      version({ id: "v2" }),
    );
    const { svc, pdf } = setup(
      pkg([track(ContentAudience.CHILD, [lesson, two])]),
    );
    // s2 (visuais) não tem imagens => 422; s1 ainda assim é gerada
    await expect(
      svc.pregenerateStagePdfs("p1", ["s2", "s1"]),
    ).resolves.toBeUndefined();
    expect(pdf.convertDocxToPdf).toHaveBeenCalledTimes(1);
  });

  it("dois pedidos ao mesmo tempo montam UM só PDF (o segundo espera e reaproveita)", async () => {
    const { svc, docx, pdf, assets } = setup(graph());
    const [a, b] = await Promise.all([
      svc.exportStage("p1", "s1", StudioExportFormat.PDF),
      svc.exportStage("p1", "s1", StudioExportFormat.PDF),
    ]);
    expect(docx.build).toHaveBeenCalledTimes(1);
    expect(pdf.convertDocxToPdf).toHaveBeenCalledTimes(1);
    expect(assets.replaceStagePdf).toHaveBeenCalledTimes(1);
    expect(a.buffer.toString()).toBe(b.buffer.toString());
  });

  it("registro já criado por outro processo (chave duplicada) não é erro nem vai para o log de erro", async () => {
    const { svc, assets } = setup(graph());
    assets.replaceStagePdf.mockRejectedValue({ code: "ER_DUP_ENTRY" });
    const error = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    try {
      const file = await svc.exportStage("p1", "s1", StudioExportFormat.PDF);
      expect(file.buffer.toString()).toContain("%PDF");
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("falha diferente de chave duplicada continua indo para o log de erro", async () => {
    const { svc, assets } = setup(graph());
    assets.replaceStagePdf.mockRejectedValue(new Error("banco caiu"));
    const error = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    try {
      await svc.exportStage("p1", "s1", StudioExportFormat.PDF);
      expect(error).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
    }
  });
});
