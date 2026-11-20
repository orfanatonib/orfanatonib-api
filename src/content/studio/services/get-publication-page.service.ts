import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";
import { GetVisitMaterialPageService } from "src/content/page/visit-material-page/services/get-visit-material-page.service";

import type { PublishedPageRef } from "../content-publication.types";

/** Reads the visit-material page through its module's service (never its repository). */
@Injectable()
export class GetPublicationPageService {
  constructor(private readonly pages: GetVisitMaterialPageService) {}

  /** Page already created for this package (`sourceLessonId` = package id), or `null`. */
  async findBySourcePackageId(
    packageId: string,
  ): Promise<PublishedPageRef | null> {
    const page = await this.pages.findBySourceLessonId(packageId);
    return page ? { id: page.id, path: page.route?.path ?? null } : null;
  }

  /** Public route path of a page; `null` when the page no longer exists. */
  async findPathById(pageId: string): Promise<string | null> {
    try {
      const page = await this.pages.findOne(pageId);
      return page.route?.path ?? null;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;
      throw error;
    }
  }
}
