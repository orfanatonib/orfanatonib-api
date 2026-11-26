import { Test } from "@nestjs/testing";
import { CommentRepository } from "../repositories/comment.repository";
import { buildCommentEntity, buildUpdateCommentDto } from "../comment.fixtures";
import { UpdateCommentDto } from "../dto/update-comment.dto";
import { CommentEntity } from "../entities/comment.entity";
import { GetCommentService } from "./get-comment.service";
import { UpdateCommentService } from "./update-comment.service";

describe("UpdateCommentService", () => {
  const repository = {
    updateAndSave: jest.fn<
      Promise<CommentEntity>,
      [CommentEntity, UpdateCommentDto]
    >(),
  };
  const getCommentService = {
    findOne: jest.fn<Promise<CommentEntity>, [string]>(),
  };

  let service: UpdateCommentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateCommentService,
        { provide: CommentRepository, useValue: repository },
        { provide: GetCommentService, useValue: getCommentService },
      ],
    }).compile();

    service = moduleRef.get(UpdateCommentService);

    getCommentService.findOne.mockResolvedValue(buildCommentEntity());
    repository.updateAndSave.mockResolvedValue(
      buildCommentEntity({ published: true }),
    );
  });

  it("loads the comment and persists the update", async () => {
    const dto = buildUpdateCommentDto();

    const result = await service.execute("comment-id", dto);

    expect(result.published).toBe(true);
    expect(getCommentService.findOne).toHaveBeenCalledWith("comment-id");
    expect(repository.updateAndSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: "comment-id" }),
      dto,
    );
  });
});
