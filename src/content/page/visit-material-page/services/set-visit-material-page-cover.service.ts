import { Injectable } from "@nestjs/common";

import { RouteService } from "src/infrastructure/route/services/route.service";

import { VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL } from "../constants";

/** Troca a imagem de apresentação (a do card) de uma página de material de visita já publicada. */
@Injectable()
export class SetVisitMaterialPageCoverService {
  constructor(private readonly routes: RouteService) {}

  /** `null` volta para a imagem padrão. */
  async execute(routeId: string, coverImageUrl: string | null): Promise<void> {
    await this.routes.updateRoute(routeId, {
      image: coverImageUrl || VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
    });
  }
}
