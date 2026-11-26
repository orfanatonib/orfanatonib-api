import { Test } from "@nestjs/testing";
import { ResourceNotFoundException } from "src/common/exceptions";
import { CommentRepository } from "../repositories/comment.repository";
import { buildCommentEntity } from "../comment.fixtures";
import { CommentEntity } from "../entities/comment.entity";
import { GetCommentService } from "./get-comment.service";

describe("GetCommentService", () => {
  const repository = {
    findAll: jest.fn<Promise<CommentEntity[]>, []>(),
    findAllPublished: jest.fn<Promise<CommentEntity[]>, []>(),
    findById: jest.fn<Promise<CommentEntity | null>, [string]>(),
    countPending: jest.fn<Promise<number>, []>(),
  };

  let service: GetCommentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetCommentService,
        { provide: CommentRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(GetCommentService);

    repository.findAll.mockResolvedValue([buildCommentEntity()]);
    repository.findAllPublished.mockResolvedValue([
      buildCommentEntity({ published: true }),
    ]);
    repository.findById.mockResolvedValue(buildCommentEntity());
  });

  it("lists every comment for administration", async () => {
    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });

  it("lists only published comments for the public endpoint", async () => {
    const result = await service.findAllPublished();

    expect(result[0].published).toBe(true);
    expect(repository.findAllPublished).toHaveBeenCalledTimes(1);
  });

  it("returns one comment by id", async () => {
    await expect(service.findOne("comment-id")).resolves.toEqual(
      expect.objectContaining({ id: "comment-id" }),
    );
    expect(repository.findById).toHaveBeenCalledWith("comment-id");
  });

  it("reports 404 when the comment does not exist", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne("missing-id")).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it("counts the comments still waiting for moderation", async () => {
    repository.countPending.mockResolvedValue(3);

    await expect(service.pendingCount()).resolves.toEqual({ pending: 3 });
    expect(repository.countPending).toHaveBeenCalledTimes(1);
  });
});
