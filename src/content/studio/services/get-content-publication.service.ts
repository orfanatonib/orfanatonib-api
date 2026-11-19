import { Injectable } from "@nestjs/common";

import { ContentPublicationResponseDto } from "../dto/content-publication-response.dto";
import { ContentPublicationRepository } from "../repositories/content-publication.repository";
import { GetPublicationPageService } from "./get-publication-page.service";

@Injectable()
export class GetContentPublicationService {
  constructor(
    private readonly publications: ContentPublicationRepository,
    private readonly pages: GetPublicationPageService,
  ) {}

  /** Latest publication of the package, or `null` when it never had one. */
  async findLatest(
    packageId: string,
  ): Promise<ContentPublicationResponseDto | null> {
    const publication = await this.publications.findLatestByPackageId(packageId);
    if (!publication) return null;
    const path = publication.visitMaterialPageId
      ? await this.pages.findPathById(publication.visitMaterialPageId)
      : null;
    return ContentPublicationResponseDto.fromEntity(publication, path);
  }
}
