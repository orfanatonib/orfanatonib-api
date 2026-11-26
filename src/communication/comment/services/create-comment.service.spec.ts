import { Test } from "@nestjs/testing";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { CommentRepository } from "../repositories/comment.repository";
import { buildCommentEntity, buildCreateCommentDto } from "../comment.fixtures";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CreateCommentService } from "./create-comment.service";

describe("CreateCommentService", () => {
  const repository = {
    createAndSave: jest.fn<Promise<CommentEntity>, [CreateCommentDto]>(),
  };
  const notificationService = {
    sendCommentNotification: jest.fn<Promise<void>, [unknown, string[]]>(),
  };
  const getUsersService = {
    findAdminEmails: jest.fn<Promise<string[]>, []>(),
  };

  let service: CreateCommentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateCommentService,
        { provide: CommentRepository, useValue: repository },
        { provide: NotificationService, useValue: notificationService },
        { provide: GetUsersService, useValue: getUsersService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(CreateCommentService);

    repository.createAndSave.mockResolvedValue(buildCommentEntity());
    getUsersService.findAdminEmails.mockResolvedValue(["admin@test.local"]);
    notificationService.sendCommentNotification.mockResolvedValue(undefined);
  });

  it("persists the comment through the repository", async () => {
    const dto = buildCreateCommentDto();

    const result = await service.execute(dto);

    expect(result.id).toBe("comment-id");
    expect(repository.createAndSave).toHaveBeenCalledWith(dto);
  });

  it("notifies admins with the saved comment data", async () => {
    await service.execute(buildCreateCommentDto());
    await new Promise((resolve) => setImmediate(resolve));

    expect(getUsersService.findAdminEmails).toHaveBeenCalledTimes(1);
    expect(notificationService.sendCommentNotification).toHaveBeenCalledWith(
      {
        authorName: "Ana",
        clubinho: "Clubinho Central",
        neighborhood: "Centro",
        comment: "As criancas gostaram muito da visita.",
      },
      ["admin@test.local"],
    );
  });

  it("skips notification when there is no admin recipient", async () => {
    getUsersService.findAdminEmails.mockResolvedValue([]);

    await service.execute(buildCreateCommentDto());
    await new Promise((resolve) => setImmediate(resolve));

    expect(notificationService.sendCommentNotification).not.toHaveBeenCalled();
  });

  it("does not fail comment creation when the notification fails", async () => {
    notificationService.sendCommentNotification.mockRejectedValue(
      new Error("smtp offline"),
    );

    await expect(service.execute(buildCreateCommentDto())).resolves.toEqual(
      expect.objectContaining({ id: "comment-id" }),
    );
    await new Promise((resolve) => setImmediate(resolve));
  });
});
