/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { FEATURE_FLAG_KEY } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import {
  AccessDeniedException,
  ResourceConflictException,
  RuleException,
  TooManyRequestsException,
} from "src/common/exceptions";
import { FeedCommentStatus } from "./enums/feed-comment-status.enum";
import { CreateFeedCommentDto } from "./dto/create-feed-comment.dto";
import { UpdateFeedCommentService } from "./services/update-feed-comment.service";
import { FeedPhotoCommentController } from "./feed-photo-comment.controller";
import { CreateFeedCommentService } from "./services/create-feed-comment.service";
import { DeleteFeedCommentService } from "./services/delete-feed-comment.service";
import { GetFeedCommentService } from "./services/get-feed-comment.service";
import { ListFeedCommentsQueryDto } from "./dto/list-feed-comments-query.dto";
import { FEED_COMMENT_MAX_LENGTH, FEED_COMMENT_RATE_LIMIT } from "./constants";
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
  status: "approved",
  moderationReason: null,
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
  const REQUEST_ID = "7f9c2d3e-1b4a-4c5d-8e6f-0a1b2c3d4e5f";

  const setup = (visible = true, existing: object | null = null) => {
    const repository = {
      create: jest.fn((d: object) => d),
      save: jest.fn(async (d: object) => ({ ...d, id: "c1" })),
      findWithAuthor: jest.fn(async () => entity()),
      findByRequest: jest.fn(async () => existing),
      countSince: jest.fn(async () => 0),
    };
    const sections = {
      assertFeedSectionVisible: jest.fn(async () => {
        if (!visible) throw new NotFoundException();
      }),
    };
    const notifications = { notifyPending: jest.fn(async () => undefined) };
    return {
      repository,
      sections,
      notifications,
      service: new CreateFeedCommentService(
        repository as never,
        sections as never,
        notifications as never,
      ),
    };
  };

  it("nasce PENDENTE, com o usuário da sessão (nunca do corpo), e devolve só nome público", async () => {
    const { service, repository, notifications } = setup();
    const out = await service.create(SECTION, ME, {
      content: " Que lindo! ",
      requestId: REQUEST_ID,
    });
    expect(repository.create).toHaveBeenCalledWith({
      sectionId: SECTION,
      authorId: "me",
      requestId: REQUEST_ID,
      content: "Que lindo!",
      status: FeedCommentStatus.PENDING,
      moderationReason: null,
      moderatedById: null,
      reviewedAt: null,
    });
    expect(out.author).toEqual({ displayName: "Maria Souza Lima" });
    expect(JSON.stringify(out)).not.toMatch(/maria@x|11999/);
    expect(out.authorId).toBeNull(); // só admin recebe authorId
    expect(out.isMine).toBe(true);
    expect(notifications.notifyPending).toHaveBeenCalledTimes(1);
  });

  it("reenvio com o mesmo requestId e conteúdo não duplica nem avisa de novo", async () => {
    const { service, repository, notifications } = setup(
      true,
      entity({ status: FeedCommentStatus.PENDING, content: "Que lindo!" }),
    );
    const out = await service.create(SECTION, ME, {
      content: "Que lindo!",
      requestId: REQUEST_ID,
    });
    expect(out.id).toBe("c1");
    expect(repository.save).not.toHaveBeenCalled();
    expect(notifications.notifyPending).not.toHaveBeenCalled();
  });

  it("requestId reaproveitado para outro conteúdo: 409", async () => {
    const { service, repository } = setup(true, entity());
    await expect(
      service.create(SECTION, ME, {
        content: "Outro texto",
        requestId: REQUEST_ID,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("corrida no UNIQUE(authorId, requestId): devolve o vencedor", async () => {
    const { service, repository } = setup();
    repository.findByRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(entity({ content: "Que lindo!" }) as never);
    repository.save.mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    const out = await service.create(SECTION, ME, {
      content: "Que lindo!",
      requestId: REQUEST_ID,
    });
    expect(out.id).toBe("c1");
  });

  it("antispam: acima do limite por minuto, 429 e nada gravado", async () => {
    const { service, repository } = setup();
    repository.countSince.mockResolvedValueOnce(FEED_COMMENT_RATE_LIMIT);
    await expect(
      service.create(SECTION, ME, { content: "oi", requestId: REQUEST_ID }),
    ).rejects.toBeInstanceOf(TooManyRequestsException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("acima do limite: 400 e nada gravado", async () => {
    const { service, repository } = setup();
    await expect(
      service.create(SECTION, ME, {
        content: "a".repeat(FEED_COMMENT_MAX_LENGTH + 1),
        requestId: REQUEST_ID,
      }),
    ).rejects.toBeInstanceOf(RuleException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("exatamente no limite passa", async () => {
    const { service } = setup();
    await expect(
      service.create(SECTION, ME, {
        content: "a".repeat(FEED_COMMENT_MAX_LENGTH),
        requestId: REQUEST_ID,
      }),
    ).resolves.toBeDefined();
  });

  it("publicação invisível: 404 antes de gravar", async () => {
    const { service, repository } = setup(false);
    await expect(
      service.create(SECTION, ME, { content: "oi", requestId: REQUEST_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("CreateFeedCommentDto", () => {
  it("exige requestId UUID v4", async () => {
    const bad = plainToInstance(CreateFeedCommentDto, { content: "oi" });
    expect((await validate(bad)).length).toBeGreaterThan(0);
    const ok = plainToInstance(CreateFeedCommentDto, {
      content: "oi",
      requestId: "7f9c2d3e-1b4a-4c5d-8e6f-0a1b2c3d4e5f",
    });
    expect(await validate(ok)).toHaveLength(0);
  });
});

describe("GetFeedCommentService", () => {
  const setup = () => {
    const repository = {
      findApprovedPageBySection: jest.fn(),
      findMinePageBySection: jest.fn(),
      findModerationPage: jest.fn(),
      countPending: jest.fn(),
      countByStatus: jest.fn(async () => ({
        pending: 1,
        approved: 2,
        rejected: 3,
      })),
      countApprovedBySectionIds: jest.fn(),
    };
    const sections = {
      assertFeedSectionVisible: jest.fn(async () => undefined),
      findFeedContexts: jest.fn(async () => new Map()),
    };
    return {
      repository,
      sections,
      service: new GetFeedCommentService(
        repository as never,
        sections as never,
      ),
    };
  };

  it("lista pública pagina só aprovados, expõe authorId só ao admin e marca canDelete", async () => {
    const { service, repository } = setup();
    const rows = [
      entity({ status: FeedCommentStatus.APPROVED }),
      entity({
        id: "c2",
        authorId: "other",
        status: FeedCommentStatus.APPROVED,
      }),
    ];
    repository.findApprovedPageBySection.mockResolvedValue([rows, 7]);

    const asMember = await service.list(SECTION, ME, 2, 2);
    expect(repository.findApprovedPageBySection).toHaveBeenCalledWith(
      SECTION,
      2,
      2,
    );
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

  it("o motivo da reprovação só chega ao autor e ao admin", async () => {
    const { service, repository } = setup();
    const rejected = entity({
      status: FeedCommentStatus.REJECTED,
      moderationReason: "Fora do tema",
    });
    repository.findApprovedPageBySection.mockResolvedValue([[rejected], 1]);
    const asOther = await service.list(
      SECTION,
      { userId: "someone", isAdmin: false },
      1,
      10,
    );
    expect(asOther.items[0].moderationReason).toBeNull();
    const asAuthor = await service.list(SECTION, ME, 1, 10);
    expect(asAuthor.items[0].moderationReason).toBe("Fora do tema");
  });

  it("'mine' consulta só o autor da sessão, em qualquer status", async () => {
    const { service, repository } = setup();
    repository.findMinePageBySection.mockResolvedValue([
      [entity({ status: FeedCommentStatus.PENDING })],
      1,
    ]);
    const out = await service.listMine(SECTION, ME, 1, 10);
    expect(repository.findMinePageBySection).toHaveBeenCalledWith(
      SECTION,
      "me",
      1,
      10,
    );
    expect(out.items[0].status).toBe(FeedCommentStatus.PENDING);
  });

  it("fila do admin: filtros repassados e publicação de contexto anexada", async () => {
    const { service, repository, sections } = setup();
    repository.findModerationPage.mockResolvedValue([
      [
        entity({
          status: FeedCommentStatus.PENDING,
          moderatedBy: { name: "Ana Paula Souza" },
          reviewedAt: new Date("2026-01-02"),
        }),
      ],
      1,
    ]);
    sections.findFeedContexts.mockResolvedValue(
      new Map([
        [
          SECTION,
          { id: SECTION, caption: "Visita", cover: null, mediaCount: 0 },
        ],
      ]),
    );
    const out = await service.listModeration(
      { page: 1, limit: 10, status: FeedCommentStatus.PENDING, search: "oi" },
      ADMIN,
    );
    expect(repository.findModerationPage).toHaveBeenCalledWith(
      1,
      10,
      FeedCommentStatus.PENDING,
      "oi",
    );
    expect(out.counts).toEqual({ pending: 1, approved: 2, rejected: 3 });
    expect(out.items[0].post?.caption).toBe("Visita");
    expect(out.items[0].moderatedByName).toBe("Ana Paula Souza");
  });

  it("pending-count e contagem do feed só de aprovados", async () => {
    const { service, repository } = setup();
    repository.countPending.mockResolvedValue(4);
    repository.countApprovedBySectionIds.mockResolvedValue(new Map([["s", 2]]));
    expect(await service.pendingCount()).toEqual({ pending: 4 });
    expect((await service.countBySectionIds(["s"])).get("s")).toBe(2);
    expect(repository.countApprovedBySectionIds).toHaveBeenCalledWith(["s"]);
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
  it.each(["list", "listMine", "create", "remove"] as const)(
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

  it.each(["moderation", "pendingCount", "approve", "reject"] as const)(
    "%s é só do admin, com sessão e as duas flags",
    (name) => {
      const fn = Reflect.get(
        FeedPhotoCommentController.prototype,
        name,
      ) as object;
      const guards = Reflect.getMetadata(GUARDS_METADATA, fn) as unknown[];
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, AdminRoleGuard]),
      );
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
      {} as UpdateFeedCommentService,
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
