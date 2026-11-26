import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PublicFilterQueryDto } from "src/shared/list-query/list-query.dto";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { ImageSectionSortBy } from "../enums/image-section-sort-by.enum";

/**
 * Fila de moderação de fotos dos abrigos. Sem `page` a resposta é o array legado.
 * `public` é o filtro de publicação (aprovada na galeria).
 */
export class ImageSectionListQueryDto extends PublicFilterQueryDto {
  @IsOptional()
  @IsUUID("all", { message: "authorId deve ser um UUID" })
  authorId?: string;

  @IsOptional()
  @IsEnum(ImageSectionReviewStatus, {
    message: "reviewStatus deve ser pending, approved ou rejected",
  })
  reviewStatus?: ImageSectionReviewStatus;

  @IsOptional()
  @IsEnum(ImageSectionSortBy, {
    message: "sortBy deve ser createdAt, caption ou reviewedAt",
  })
  sortBy?: ImageSectionSortBy;
}
