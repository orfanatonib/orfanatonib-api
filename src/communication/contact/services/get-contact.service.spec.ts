import { Test } from "@nestjs/testing";
import { GetContactService } from "./get-contact.service";
import { ContactRepository } from "../contact.repository";

describe("GetContactService", () => {
  const repository = { getAll: jest.fn(), countUnread: jest.fn() };
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

  it("returns all contacts", async () => {
    const contacts = [{ id: "1", name: "Maria" }];
    repository.getAll.mockResolvedValue(contacts);

    const result = await service.getAllContacts();

    expect(result).toEqual(contacts);
    expect(repository.getAll).toHaveBeenCalledTimes(1);
  });

  it("counts the messages still unread", async () => {
    repository.countUnread.mockResolvedValue(4);

    await expect(service.pendingCount()).resolves.toEqual({ pending: 4 });
  });
});
