import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import {
  SHELTER_DEFAULT_ROUTE_DESCRIPTION,
  SHELTER_ROUTE_ENTITY_TYPE,
  SHELTER_ROUTE_PREFIX,
} from "../constants";

/**
 * Toda a rota pública do abrigo em um lugar. Antes a criação, a atualização e
 * a troca de imagem montavam a rota cada uma do seu jeito — inclusive com três
 * grafias diferentes de `entityType`, o que deixava a consulta de exclusão sem
 * casar com o que a criação gravava.
 */
@Injectable()
export class ShelterRouteService {
  constructor(private readonly routeService: RouteService) {}

  /** Subtítulo da rota: o endereço resumido do abrigo. */
  static buildSubtitle(address: AddressEntity | null | undefined): string {
    if (!address) return "";
    return `${address.city} - ${address.state}, ${address.district} ${address.number ?? ""}`.trim();
  }

  findByShelter(shelterId: string): Promise<RouteEntity | null> {
    return this.routeService.findRouteByEntityId(shelterId);
  }

  /** Cria a rota junto com o abrigo, dentro da mesma transação. */
  async createForShelter(
    manager: EntityManager,
    shelter: ShelterEntity,
    description: string | undefined,
    imageUrl: string,
  ): Promise<RouteEntity> {
    const path = await this.routeService.generateAvailablePath(
      shelter.name,
      SHELTER_ROUTE_PREFIX,
    );

    return this.routeService.createRouteWithManager(manager, {
      title: shelter.name,
      subtitle: ShelterRouteService.buildSubtitle(shelter.address),
      description: description || SHELTER_DEFAULT_ROUTE_DESCRIPTION,
      path,
      type: RouteType.PAGE,
      entityId: shelter.id,
      idToFetch: shelter.id,
      entityType: SHELTER_ROUTE_ENTITY_TYPE,
      image: imageUrl,
      public: true,
    });
  }

  /**
   * Espelha na rota o que mudou no abrigo. Só os campos informados são
   * tocados; se a rota não existir ainda, ela é criada.
   */
  async syncWithShelter(
    shelter: ShelterEntity,
    changes: { name?: string; description?: string; addressChanged?: boolean },
    imageUrl?: string,
  ): Promise<RouteEntity> {
    const route = await this.findByShelter(shelter.id);

    if (!route) {
      return this.routeService.createRoute({
        title: shelter.name,
        subtitle: ShelterRouteService.buildSubtitle(shelter.address),
        description: shelter.description ?? "",
        entityType: SHELTER_ROUTE_ENTITY_TYPE,
        entityId: shelter.id,
        idToFetch: shelter.id,
        type: RouteType.PAGE,
        image: imageUrl ?? "",
        public: true,
        prefix: SHELTER_ROUTE_PREFIX,
      });
    }

    const updates: Partial<RouteEntity> = {};
    if (changes.name) {
      updates.title = changes.name;
      updates.path = SHELTER_ROUTE_PREFIX;
    }
    if (changes.description !== undefined)
      updates.description = changes.description ?? "";
    if (changes.addressChanged) {
      updates.subtitle = ShelterRouteService.buildSubtitle(shelter.address);
    }
    if (imageUrl) updates.image = imageUrl;

    if (Object.keys(updates).length === 0) return route;

    return this.routeService.upsertRoute(route.id, updates);
  }

  /** Remove a rota do abrigo, casando pelo `entityType` que a criação grava. */
  async removeForShelter(shelterId: string): Promise<void> {
    await this.routeService.removeRouteByEntity(
      SHELTER_ROUTE_ENTITY_TYPE,
      shelterId,
    );
  }
}
