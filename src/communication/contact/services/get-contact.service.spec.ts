import { InternalServerErrorException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { GetContactService } from "./get-contact.service";
import { ContactRepository } from "../contact.repository";

describe("GetContactService", () => {
  const repository = { findFiltered: jest.fn(), countUnread: jest.fn() };
  let service: GetContactService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetContactService,
        { provide: ContactRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(GetContactService);
  });

  it("returns the filtered contacts and the filtered total", async () => {
    const items = [{ id: "1", name: "Maria" }];
    repository.findFiltered.mockResolvedValue({ items, total: 7 });
    const query = { read: false, page: 2 } as never;

    const result = await service.findFiltered(query);

    expect(result).toEqual({ items, total: 7 });
    expect(repository.findFiltered).toHaveBeenCalledWith(query);
  });

  it("turns a repository failure into a 500 without leaking details", async () => {
    repository.findFiltered.mockRejectedValue(new Error("db secret"));

    await expect(service.findFiltered()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("counts the messages still unread", async () => {
    repository.countUnread.mockResolvedValue(4);

    await expect(service.pendingCount()).resolves.toEqual({ pending: 4 });
  });
});
