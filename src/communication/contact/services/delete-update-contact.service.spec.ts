import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ContactRepository } from "../contact.repository";
import { ContactEntity } from "../contact.entity";
import { DeleteContactService } from "./delete-contact.service";
import { UpdateContactService } from "./update-contact.service";

describe("DeleteContactService / UpdateContactService", () => {
  let repo: { findOneById: jest.Mock; remove: jest.Mock; save: jest.Mock };
  let del: DeleteContactService;
  let upd: UpdateContactService;

  beforeEach(() => {
    repo = { findOneById: jest.fn(), remove: jest.fn(), save: jest.fn() };
    const asRepo = repo as unknown as ContactRepository;
    del = new DeleteContactService(asRepo);
    upd = new UpdateContactService(asRepo);
  });

  it("delete: remove o contato existente", async () => {
    const contact = { id: "c1" } as ContactEntity;
    repo.findOneById.mockResolvedValue(contact);
    await del.execute("c1");
    expect(repo.remove).toHaveBeenCalledWith(contact);
  });

  it("delete: 404 quando não existe e não remove", async () => {
    repo.findOneById.mockResolvedValue(null);
    await expect(del.execute("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it("delete: falha do banco vira 500 padronizado", async () => {
    repo.findOneById.mockResolvedValue({ id: "c1" });
    repo.remove.mockRejectedValue(new Error("db down"));
    await expect(del.execute("c1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("update: marca como lido e salva", async () => {
    const contact = { id: "c1", read: false } as ContactEntity;
    repo.findOneById.mockResolvedValue(contact);
    const result = await upd.setReadOnContact("c1");
    expect(result.read).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(contact);
  });

  it("update: 404 quando não existe", async () => {
    repo.findOneById.mockResolvedValue(null);
    await expect(upd.setReadOnContact("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("update: falha ao salvar vira 500 padronizado", async () => {
    repo.findOneById.mockResolvedValue({ id: "c1", read: false });
    repo.save.mockRejectedValue(new Error("db down"));
    await expect(upd.setReadOnContact("c1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
