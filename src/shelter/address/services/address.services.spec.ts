import { NotFoundException } from "@nestjs/common";

import { AddressEntity } from "../entities/address.entity/address.entity";
import { AddressesService } from "./addresses.service";
import { CreateAddressService } from "./create-address.service";
import { GetAddressService } from "./get-address.service";
import { UpdateAddressService } from "./update-address.service";

const ADDRESS = { id: "a1", street: "Rua A", city: "Manaus" } as AddressEntity;

function build(found: AddressEntity | null = ADDRESS) {
  const repo = {
    create: jest.fn(
      (partial: Partial<AddressEntity>) => ({ ...partial }) as AddressEntity,
    ),
    save: jest.fn((entity: AddressEntity) => Promise.resolve(entity)),
    findById: jest.fn().mockResolvedValue(found),
    merge: jest.fn(
      (target: AddressEntity, partial: Partial<AddressEntity>) =>
        ({ ...target, ...partial }) as AddressEntity,
    ),
  };
  const create = new CreateAddressService(repo as never);
  const get = new GetAddressService(repo as never);
  const update = new UpdateAddressService(repo as never);
  const facade = new AddressesService(create, get, update);
  return { repo, create, get, update, facade };
}

describe("CreateAddressService", () => {
  it("create devolve a entidade montada sem gravar; save grava", async () => {
    const { create, repo } = build();
    const entity = create.create({ street: "Rua B" });
    expect(entity.street).toBe("Rua B");
    expect(repo.save).not.toHaveBeenCalled();
    await create.save(entity);
    expect(repo.save).toHaveBeenCalledWith(entity);
  });

  it("falha do repositório propaga (nada é engolido)", async () => {
    const { create, repo } = build();
    repo.save.mockRejectedValue(new Error("db"));
    await expect(create.save({} as AddressEntity)).rejects.toThrow("db");
  });
});

describe("GetAddressService", () => {
  it("findById devolve o endereço ou null", async () => {
    await expect(build().get.findById("a1")).resolves.toEqual(ADDRESS);
    await expect(build(null).get.findById("x")).resolves.toBeNull();
  });
});

describe("UpdateAddressService", () => {
  it("update mescla só os campos informados e grava", async () => {
    const { update, repo } = build();
    const out = await update.update("a1", { street: "Nova Rua" });
    expect(out).toMatchObject({ id: "a1", street: "Nova Rua", city: "Manaus" });
    expect(repo.save).toHaveBeenCalled();
  });

  it("endereço inexistente é 404 e nada é gravado", async () => {
    const { update, repo } = build(null);
    await expect(update.update("x", { street: "Z" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("merge não grava", () => {
    const { update, repo } = build();
    expect(update.merge(ADDRESS, { city: "Parintins" }).city).toBe("Parintins");
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("AddressesService (fachada)", () => {
  it("delega create/merge/save/findById/update aos serviços de operação", async () => {
    const { facade, repo } = build();
    const created = facade.create({ street: "X" });
    expect(created.street).toBe("X");
    expect(facade.merge(ADDRESS, { city: "Y" }).city).toBe("Y");
    await facade.save(created);
    await expect(facade.findById("a1")).resolves.toEqual(ADDRESS);
    await expect(facade.update("a1", { city: "Z" })).resolves.toMatchObject({
      city: "Z",
    });
    expect(repo.save).toHaveBeenCalledTimes(2);
  });
});
