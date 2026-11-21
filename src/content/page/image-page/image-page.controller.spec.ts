import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImageController } from "./image-page.controller";

const raw = JSON.stringify({
  id: "x",
  title: "T",
  description: "D",
  public: true,
  sections: [],
});

function setup() {
  const update = { updateImagePage: jest.fn() };
  const remove = { removePage: jest.fn() };
  const controller = new ImageController(
    {} as never,
    remove as never,
    {} as never,
    update as never,
  );
  return { controller, update, remove };
}

describe("ImageController: 404 padrão para id inexistente", () => {
  it("PATCH: NotFoundException do serviço chega como 404 (não é embrulhada em 400)", async () => {
    const { controller, update } = setup();
    update.updateImagePage.mockRejectedValue(new NotFoundException("x"));
    await expect(controller.update("x", [], raw)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("PATCH: outras falhas continuam 400", async () => {
    const { controller, update } = setup();
    update.updateImagePage.mockRejectedValue(new Error("boom"));
    await expect(controller.update("x", [], raw)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("DELETE: NotFoundException do serviço chega como 404", async () => {
    const { controller, remove } = setup();
    remove.removePage.mockRejectedValue(new NotFoundException("x"));
    await expect(controller.remove("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
