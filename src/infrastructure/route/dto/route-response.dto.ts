import { RouteEntity, RouteType } from "../route-page.entity";

/** Contrato público de `GET /routes` e `GET /routes/:id` (o front monta menu, cards e rotas a partir dele). */
export class RouteResponseDto {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  public: boolean;
  current: boolean;
  image: string | null;
  idToFetch: string;
  entityType: string;
  entityId: string;
  type: RouteType;
  createdAt: Date;
  updatedAt: Date;
}

export const toRouteResponse = (route: RouteEntity): RouteResponseDto => ({
  id: route.id,
  title: route.title,
  subtitle: route.subtitle,
  description: route.description,
  path: route.path,
  public: route.public,
  current: route.current ?? false,
  image: route.image ?? null,
  idToFetch: route.idToFetch,
  entityType: route.entityType,
  entityId: route.entityId,
  type: route.type,
  createdAt: route.createdAt,
  updatedAt: route.updatedAt,
});
