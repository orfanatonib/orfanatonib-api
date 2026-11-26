import { IsEnum, IsOptional } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { DocumentSortBy } from "../enums/document-sort-by.enum";

export class QueryDocumentDto extends ListQueryDto {
  /** `upload` (arquivo enviado) ou `link`, conforme a mídia do documento. */
  @IsOptional()
  @IsEnum(UploadType, { message: "uploadType deve ser upload ou link" })
  uploadType?: UploadType;

  @IsOptional()
  @IsEnum(DocumentSortBy, { message: "sortBy deve ser createdAt ou name" })
  sortBy?: DocumentSortBy;
}
