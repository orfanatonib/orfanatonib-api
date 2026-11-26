import { RuleException } from "src/common/exceptions";

import { CreateIdeasSectionDto } from "../dto/create-ideas-section.dto";
import {
  parseIdeasSectionPayload,
  toFilesDict,
} from "./ideas-section-payload.util";

/** Os detalhes viajam no corpo da `HttpException`, não numa propriedade. */
const detailsOf = (error: unknown): Array<{ field: string }> =>
  (
    (error as RuleException).getResponse() as {
      details: Array<{ field: string }>;
    }
  ).details;
import { buildFile } from "../ideas-section.fixtures";

describe("parseIdeasSectionPayload", () => {
  const valid = JSON.stringify({
    title: "Ideia",
    description: "Descrição",
    medias: [],
  });

  it("devolve o DTO quando o JSON é válido", () => {
    const dto = parseIdeasSectionPayload(valid, CreateIdeasSectionDto);

    expect(dto).toBeInstanceOf(CreateIdeasSectionDto);
    expect(dto.title).toBe("Ideia");
  });

  it("aceita o campo como Buffer, que é como o multipart o entrega", () => {
    const dto = parseIdeasSectionPayload(
      Buffer.from(valid),
      CreateIdeasSectionDto,
    );

    expect(dto.description).toBe("Descrição");
  });

  it.each([
    ["ausente", undefined],
    ["vazio", ""],
  ])("exige o payload quando está %s", (_label, raw) => {
    expect(() => parseIdeasSectionPayload(raw, CreateIdeasSectionDto)).toThrow(
      RuleException,
    );
  });

  it("vira 400, e não 500, quando o JSON está quebrado", () => {
    // `JSON.parse` estourava SyntaxError e o filtro global respondia 500 com
    // a stack no corpo.
    expect(() => parseIdeasSectionPayload("{", CreateIdeasSectionDto)).toThrow(
      RuleException,
    );
  });

  it("recusa campo desconhecido e diz qual é", () => {
    try {
      parseIdeasSectionPayload(
        JSON.stringify({ title: "a", description: "b", xpto: 1 }),
        CreateIdeasSectionDto,
      );
      fail("deveria ter lançado");
    } catch (error) {
      const details = detailsOf(error);
      expect(details.map((detail) => detail.field)).toContain("xpto");
    }
  });

  it("recusa a seção sem título e sem descrição", () => {
    try {
      parseIdeasSectionPayload(JSON.stringify({}), CreateIdeasSectionDto);
      fail("deveria ter lançado");
    } catch (error) {
      const details = detailsOf(error);
      expect(details.map((detail) => detail.field).sort()).toEqual([
        "description",
        "title",
      ]);
    }
  });

  it("recusa mídia com tipo fora dos três aceitos", () => {
    expect(() =>
      parseIdeasSectionPayload(
        JSON.stringify({
          title: "a",
          description: "b",
          medias: [
            {
              uploadType: "link",
              mediaType: "audio",
              isLocalFile: false,
              url: "x",
            },
          ],
        }),
        CreateIdeasSectionDto,
      ),
    ).toThrow(RuleException);
  });
});

describe("toFilesDict", () => {
  it("indexa os arquivos pelo nome do campo", () => {
    const files = [
      buildFile({ fieldname: "image_upload" }),
      buildFile({ fieldname: "video_upload" }),
    ];

    expect(Object.keys(toFilesDict(files)).sort()).toEqual([
      "image_upload",
      "video_upload",
    ]);
  });

  it("devolve um dicionário vazio sem arquivo algum", () => {
    expect(toFilesDict()).toEqual({});
  });
});
