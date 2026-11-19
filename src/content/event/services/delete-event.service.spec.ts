import { NotFoundException } from "@nestjs/common";
import { DeleteEventService } from "./delete-event.service";
import { EventRepository } from "../event.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { EventNotificationHelper } from "./event-notification.helper";
import { EVENT_MEDIA_TARGET } from "./create-event.service";

describe("DeleteEventService", () => {
  let repo: { findById: jest.Mock; remove: jest.Mock };
  let media: {
    findMediaItemsByTarget: jest.Mock;
    removeMediaItemsKeepingFiles: jest.Mock;
  };
  let storage: { deleteAfterCommit: jest.Mock };
  let notify: { notifyEventDeleted: jest.Mock };
  let service: DeleteEventService;
  const order: string[] = [];

  beforeEach(() => {
    order.length = 0;
    repo = {
      findById: jest.fn().mockResolvedValue({ id: "e1" }),
      remove: jest.fn().mockImplementation(async () => {
        order.push("row");
      }),
    };
    media = {
      findMediaItemsByTarget: jest.fn().mockResolvedValue([{ id: "m1" }]),
      removeMediaItemsKeepingFiles: jest
        .fn()
        .mockResolvedValue(["https://b/x.png"]),
    };
    storage = {
      deleteAfterCommit: jest.fn().mockImplementation(async () => {
        order.push("bucket");
      }),
    };
    notify = { notifyEventDeleted: jest.fn().mockResolvedValue(undefined) };
    service = new DeleteEventService(
      repo as unknown as EventRepository,
      media as unknown as MediaItemProcessor,
      storage as unknown as MediaStorageService,
      notify as unknown as EventNotificationHelper,
    );
  });

  it("apaga a linha antes do objeto do bucket e notifica", async () => {
    await service.remove("e1");
    expect(media.findMediaItemsByTarget).toHaveBeenCalledWith(
      "e1",
      EVENT_MEDIA_TARGET,
    );
    expect(order).toEqual(["row", "bucket"]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith(["https://b/x.png"]);
    expect(notify.notifyEventDeleted).toHaveBeenCalled();
  });

  it("404 quando o evento não existe e nada é apagado", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("se o banco falha, o bucket não é tocado", async () => {
    repo.remove.mockRejectedValue(new Error("db"));
    await expect(service.remove("e1")).rejects.toThrow("db");
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("falha na notificação não derruba a exclusão", async () => {
    notify.notifyEventDeleted.mockRejectedValue(new Error("smtp"));
    await expect(service.remove("e1")).resolves.toBeUndefined();
  });
});
