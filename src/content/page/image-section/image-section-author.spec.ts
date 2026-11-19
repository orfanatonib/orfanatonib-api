import { NotFoundException } from "@nestjs/common";
import { GetImageSectionService } from "./services/get-image-section.service";
import { toSectionAuthorDto } from "./utils";
import { ImageSectionResponseDto } from "./dto/image-section-response.dto";

describe("autoria da seção", () => {
  it("toSectionAuthorDto: só nome público; sem autor → null", () => {
    expect(toSectionAuthorDto({ name: "João da Silva" })).toEqual({
      displayName: "João S.",
    });
    expect(toSectionAuthorDto(null)).toBeNull();
    expect(toSectionAuthorDto(undefined)).toBeNull();
  });

  it("DTO de moderação carrega authorId e nome, nunca e-mail/telefone", () => {
    const dto = ImageSectionResponseDto.fromEntity(
      {
        id: "s",
        caption: "c",
        description: "d",
        public: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: "u1", name: "Ana Paula", email: "a@b.c", phone: "119" },
      } as never,
      [],
    );
    expect(dto.authorId).toBe("u1");
    expect(dto.author).toEqual({ displayName: "Ana P." });
    expect(JSON.stringify(dto)).not.toMatch(/a@b\.c|119/);
  });

  it("seção antiga (sem autor): authorId e author nulos", () => {
    const dto = ImageSectionResponseDto.fromEntity(
      { id: "s", caption: "c", description: "d", public: true } as never,
      [],
    );
    expect(dto.authorId).toBeNull();
    expect(dto.author).toBeNull();
  });

  describe("assertFeedSectionVisible", () => {
    const make = (section: object | null) =>
      new GetImageSectionService(
        { findPublishedById: jest.fn(async () => section) } as never,
        {} as never,
      );

    it("inexistente ou sem galeria (fila de moderação): 404", async () => {
      await expect(
        make(null).assertFeedSectionVisible("s", true),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("visitante: só seção e galeria públicas", async () => {
      const privateSection = { public: false, page: { public: true } };
      const privatePage = { public: true, page: { public: false } };
      const open = { public: true, page: { public: true } };
      await expect(
        make(privateSection).assertFeedSectionVisible("s", false),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        make(privatePage).assertFeedSectionVisible("s", false),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        make(open).assertFeedSectionVisible("s", false),
      ).resolves.toBeUndefined();
    });

    it("com sessão: vê as privadas também", async () => {
      await expect(
        make({
          public: false,
          page: { public: false },
        }).assertFeedSectionVisible("s", true),
      ).resolves.toBeUndefined();
    });
  });
});
