/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { FEATURE_FLAG_KEY } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { AccessDeniedException, RuleException } from "src/common/exceptions";
import { FeedPhotoCommentController } from "./feed-photo-comment.controller";
import { CreateFeedCommentService } from "./services/create-feed-comment.service";
import { DeleteFeedCommentService } from "./services/delete-feed-comment.service";
import { GetFeedCommentService } from "./services/get-feed-comment.service";
import { ListFeedCommentsQueryDto } from "./dto/list-feed-comments-query.dto";
import { FEED_COMMENT_MAX_LENGTH } from "./constants";
import {
  canDeleteComment,
  containsSensitiveData,
  normalizeCommentContent,
  prepareCommentContent,
} from "./utils";

const SECTION = "section-1";
const ME = { userId: "me", isAdmin: false };
const ADMIN = { userId: "admin", isAdmin: true };

const entity = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  sectionId: SECTION,
  authorId: "me",
  content: "Que lindo!",
  createdAt: new Date("2026-01-01"),
  author: {
    name: "Maria Souza Lima",
    email: "maria@x.com",
    phone: "11999999999",
  },
  ...over,
});

describe("utils de comentário (privacidade)", () => {
  it("normaliza controle e espaços", () => {
    expect(normalizeCommentContent("  oi \u0007  mundo \n\n\n\n fim ")).toBe(
      "oi mundo \n\n fim",
    );
  });

  it.each([
    "me liga 11 99999-1234",
    "escreva para ana@igreja.org",
    "veja https://site.com/foto",
    "www.exemplo.com",
    "cpf 123.456.789-09",
  ])("detecta dado pessoal: %s", (text) => {
    expect(containsSensitiveData(text)).toBe(true);
  });

  it("não bloqueia texto comum nem números curtos", () => {
    expect(
      containsSensitiveData("Foram 12 crianças no dia 5! Deus abençoe"),
    ).toBe(false);
  });

  it("prepare: vazio e dado pessoal viram 400 (RuleException)", () => {
    expect(() => prepareCommentContent("   ")).toThrow(RuleException);
    expect(() => prepareCommentContent("tel 11999991234")).toThrow(
      RuleException,
    );
    expect(prepareCommentContent(" Amém! ")).toBe("Amém!");
  });

  it("canDeleteComment: autor ou admin; outro membro não; autor removido só admin", () => {
    expect(canDeleteComment("me", ME)).toBe(true);
    expect(canDeleteComment("other", ME)).toBe(false);
    expect(canDeleteComment("other", ADMIN)).toBe(true);
    expect(canDeleteComment(null, ME)).toBe(false);
  });
});

describe("CreateFeedCommentService", () => {
  const setup = (visible = true) => {
    const repository = {
      create: jest.fn((d: object) => d),
      save: jest.fn(async (d: object) => ({ ...d, id: "c1" })),
      findWithAuthor: jest.fn(async () => entity()),
    };
    const sections = {
      assertFeedSectionVisible: jest.fn(async () => {
        if (!visible) throw new NotFoundException();
      }),
    };
    return {
      repository,
      sections,
      service: new CreateFeedCommentService(
        repository as never,
        sections as never,
      ),
    };
  };

  it("grava com o usuário da sessão (nunca do corpo) e devolve só nome público", async () => {
    const { service, repository } = setup();
    const out = await service.create(SECTION, ME, { content: " Que lindo! " });
    expect(repository.create).toHaveBeenCalledWith({
      sectionId: SECTION,
      authorId: "me",
      content: "Que lindo!",
    });
    expect(out.author).toEqual({ displayName: "Maria L." });
    expect(JSON.stringify(out)).not.toMatch(/maria@x|11999|Souza/);
    expect(out.authorId).toBeNull(); // só admin recebe authorId
    expect(out.isMine).toBe(true);
  });

  it("acima do limite: 400 e nada gravado", async () => {
    const { service, repository } = setup();
    await expect(
      service.create(SECTION, ME, {
        content: "a".repeat(FEED_COMMENT_MAX_LENGTH + 1),
      }),
    ).rejects.toBeInstanceOf(RuleException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("exatamente no limite passa", async () => {
    const { service } = setup();
    await expect(
      service.create(SECTION, ME, {
        content: "a".repeat(FEED_COMMENT_MAX_LENGTH),
      }),
    ).resolves.toBeDefined();
  });

  it("publicação invisível: 404 antes de gravar", async () => {
    const { service, repository } = setup(false);
    await expect(
      service.create(SECTION, ME, { content: "oi" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("GetFeedCommentService", () => {
  it("pagina, expõe authorId só ao admin e marca canDelete", async () => {
    const rows = [entity(), entity({ id: "c2", authorId: "other" })];
    const repository = {
      findPageBySection: jest.fn(async () => [rows, 7]),
      countBySectionIds: jest.fn(),
    };
    const sections = {
      assertFeedSectionVisible: jest.fn(async () => undefined),
    };
    const service = new GetFeedCommentService(
      repository as never,
      sections as never,
    );

    const asMember = await service.list(SECTION, ME, 2, 2);
    expect(repository.findPageBySection).toHaveBeenCalledWith(SECTION, 2, 2);
    expect(asMember).toMatchObject({ page: 2, limit: 2, total: 7 });
    expect(asMember.items.map((i) => [i.canDelete, i.authorId])).toEqual([
      [true, null],
      [false, null],
    ]);

    const asAdmin = await service.list(SECTION, ADMIN, 1, 10);
    expect(asAdmin.items.map((i) => [i.canDelete, i.authorId])).toEqual([
      [true, "me"],
      [true, "other"],
    ]);
  });
});

describe("DeleteFeedCommentService", () => {
  const setup = (found: object | null) => {
    const repository = {
      findOneBy: jest.fn(async () => found),
      delete: jest.fn(async () => ({ affected: 1 })),
    };
    return {
      repository,
      service: new DeleteFeedCommentService(repository as never),
    };
  };

  it("autor remove o seu", async () => {
    const { service, repository } = setup({ id: "c1", authorId: "me" });
    await service.remove("c1", ME);
    expect(repository.delete).toHaveBeenCalledWith({ id: "c1" });
  });

  it("admin remove o de qualquer um (moderação)", async () => {
    const { service, repository } = setup({ id: "c1", authorId: "other" });
    await service.remove("c1", ADMIN);
    expect(repository.delete).toHaveBeenCalled();
  });

  it("outro membro: 403 e nada removido", async () => {
    const { service, repository } = setup({ id: "c1", authorId: "other" });
    await expect(service.remove("c1", ME)).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("inexistente: 404", async () => {
    const { service } = setup(null);
    await expect(service.remove("x", ME)).rejects.toBeDefined();
  });
});

describe("ListFeedCommentsQueryDto", () => {
  const check = async (raw: object) =>
    validate(plainToInstance(ListFeedCommentsQueryDto, raw));

  it("padrões válidos", async () => {
    const dto = plainToInstance(ListFeedCommentsQueryDto, {});
    expect([dto.page, dto.limit]).toEqual([1, 10]);
    expect(await check({})).toHaveLength(0);
  });

  it.each([{ page: "0" }, { limit: "0" }, { limit: "51" }, { limit: "abc" }])(
    "%j é recusado (400)",
    async (raw) => {
      expect((await check(raw)).length).toBeGreaterThan(0);
    },
  );
});

describe("FeedPhotoCommentController", () => {
  it.each(["list", "create", "remove"] as const)(
    "%s exige sessão e as duas flags",
    (name) => {
      const fn = Reflect.get(
        FeedPhotoCommentController.prototype,
        name,
      ) as object;
      expect(Reflect.getMetadata(GUARDS_METADATA, fn)).toContain(JwtAuthGuard);
      expect(Reflect.getMetadata(FEATURE_FLAG_KEY, fn)).toEqual([
        "shelter_feed",
        "shelter_feed_comments",
      ]);
    },
  );

  it("role vem do token normalizado (ADMIN em maiúsculas vale)", async () => {
    const getService = { list: jest.fn(async () => ({})) };
    const controller = new FeedPhotoCommentController(
      {} as CreateFeedCommentService,
      getService as unknown as GetFeedCommentService,
      {} as DeleteFeedCommentService,
    );
    await controller.list("id", { page: 1, limit: 10 }, {
      user: { userId: "u", role: "ADMIN" },
    } as never);
    expect(getService.list).toHaveBeenCalledWith(
      "id",
      { userId: "u", isAdmin: true },
      1,
      10,
    );
  });
});
