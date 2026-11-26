import { Test } from "@nestjs/testing";
import { CommentRepository } from "../repositories/comment.repository";
import { buildCommentEntity } from "../comment.fixtures";
import { CommentEntity } from "../entities/comment.entity";
import { DeleteCommentService } from "./delete-comment.service";
import { GetCommentService } from "./get-comment.service";

describe("DeleteCommentService", () => {
  const repository = {
    removeComment: jest.fn<Promise<void>, [CommentEntity]>(),
  };
  const getCommentService = {
    findOne: jest.fn<Promise<CommentEntity>, [string]>(),
  };

  let service: DeleteCommentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteCommentService,
        { provide: CommentRepository, useValue: repository },
        { provide: GetCommentService, useValue: getCommentService },
      ],
    }).compile();

    service = moduleRef.get(DeleteCommentService);

    getCommentService.findOne.mockResolvedValue(buildCommentEntity());
    repository.removeComment.mockResolvedValue(undefined);
  });

  it("loads the comment before deleting it", async () => {
    await service.execute("comment-id");

    expect(getCommentService.findOne).toHaveBeenCalledWith("comment-id");
    expect(repository.removeComment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "comment-id" }),
    );
  });
});
