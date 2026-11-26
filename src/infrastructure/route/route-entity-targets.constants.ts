import type { EntityTarget } from "typeorm";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { MeditationEntity } from "src/content/meditation/entities/meditation.entity";
import { EventEntity } from "src/content/event/entities/event.entity";
import { DocumentEntity } from "src/content/document/entities/document.entity";
import { VisitMaterialsPageEntity } from "src/content/page/visit-material-page/entities/visit-material-page.entity";
import { VideosPage } from "src/content/page/video-page/entities/video-page.entity";
import { ImagePageEntity } from "src/content/page/image-page/entities/image-page.entity";
import { IdeasPageEntity } from "src/content/page/ideas-page/entities/ideas-page.entity";
import { InformativeEntity } from "src/content/informative/entities/informative.entity";

/** O que a checagem de órfãs precisa de qualquer entidade: só a chave. */
export interface IdOnlyEntity {
  id: string;
}

/**
 * Entidade que uma rota (`entityType`) aponta. `MeditationDay` usa a meditação: o
 * `idToFetch` dessas rotas é o id da meditação, não o do dia.
 */
export const ROUTE_ENTITY_TARGETS: Readonly<
  Record<string, EntityTarget<IdOnlyEntity>>
> = {
  shelterPage: ShelterEntity,
  ShelterPage: ShelterEntity,
  ShelterEntity: ShelterEntity,
  Meditation: MeditationEntity,
  MeditationDay: MeditationEntity,
  Event: EventEntity,
  Document: DocumentEntity,
  VisitMaterialsPage: VisitMaterialsPageEntity,
  VideosPage: VideosPage,
  ImagesPage: ImagePageEntity,
  IdeasPage: IdeasPageEntity,
  Informative: InformativeEntity,
};
