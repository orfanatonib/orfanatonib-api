import { RouteType } from "src/infrastructure/route/route-page.entity";
import {
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { TestamentType } from "../enums/testament-type.enum";

export class VisitMediaItemResponseDTO {
  id: string;
  title: string;
  description: string;
  uploadType: UploadType;
  mediaType: MediaType;
  platformType?: PlatformType;
  url: string;
  isLocalFile?: boolean;
  size?: number;
  originalName?: string;
}

export class VisitRouteResponseDTO {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  description: string;
  type: RouteType;
  public: boolean;
}

export class VisitMaterialsPageResponseDTO {
  id: string;
  title: string;
  subtitle: string;
  testament: TestamentType;
  description: string;
  currentWeek: boolean;
  route: VisitRouteResponseDTO;
  videos: VisitMediaItemResponseDTO[];
  documents: VisitMediaItemResponseDTO[];
  images: VisitMediaItemResponseDTO[];
  audios: VisitMediaItemResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}
