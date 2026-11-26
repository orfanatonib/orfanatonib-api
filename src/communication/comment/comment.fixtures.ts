import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { CommentEntity } from "./entities/comment.entity";

export function buildCreateCommentDto(
  overrides: Partial<CreateCommentDto> = {},
): CreateCommentDto {
  return {
    name: "Ana",
    comment: "As criancas gostaram muito da visita.",
    shelter: "Clubinho Central",
    neighborhood: "Centro",
    ...overrides,
  };
}

export function buildUpdateCommentDto(
  overrides: Partial<UpdateCommentDto> = {},
): UpdateCommentDto {
  return {
    name: "Ana Souza",
    comment: "Comentario revisado pela coordenacao.",
    shelter: "Clubinho Norte",
    neighborhood: "Flores",
    published: true,
    ...overrides,
  };
}

export function buildCommentEntity(
  overrides: Partial<CommentEntity> = {},
): CommentEntity {
  return Object.assign(new CommentEntity(), {
    id: "comment-id",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    name: "Ana",
    comment: "As criancas gostaram muito da visita.",
    shelter: "Clubinho Central",
    neighborhood: "Centro",
    published: false,
    ...overrides,
  });
}
