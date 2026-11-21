import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateIdeasPageDto } from "./dto/create-ideas-page.dto";
import { UpdateIdeasPageDto } from "./dto/update-ideas-page.dto";
import { IdeasPageResponseDto } from "./dto/ideas-page-response.dto";

const base = { title: "t", description: "d", sections: [] };

describe("página de ideias é sempre privada", () => {
  it("create: `public: true` é rejeitado; ausente e `false` passam", async () => {
    const bad = plainToInstance(CreateIdeasPageDto, { ...base, public: true });
    expect((await validate(bad)).map((e) => e.property)).toContain("public");
    for (const body of [base, { ...base, public: false }]) {
      expect(await validate(plainToInstance(CreateIdeasPageDto, body))).toEqual(
        [],
      );
    }
  });

  it("update: `public: true` é rejeitado; ausente e `false` passam", async () => {
    const full = { ...base, id: "p1" };
    const bad = plainToInstance(UpdateIdeasPageDto, { ...full, public: true });
    expect((await validate(bad)).map((e) => e.property)).toContain("public");
    for (const body of [full, { ...full, public: false }]) {
      expect(await validate(plainToInstance(UpdateIdeasPageDto, body))).toEqual(
        [],
      );
    }
  });

  it("resposta não traz `public` da página e força a rota privada (legado `true` ignorado)", () => {
    const now = new Date();
    const res = IdeasPageResponseDto.fromEntity(
      {
        id: "p",
        title: "t",
        subtitle: "",
        description: "d",
        public: true,
        route: { id: "r", path: "/x", public: true },
        sections: [],
        createdAt: now,
        updatedAt: now,
      } as never,
      new Map(),
    );
    expect("public" in res).toBe(false);
    expect(res.route.public).toBe(false);
  });
});
