import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";

export class ContentStageDefinitionResponseDto {
  type: ContentStageType;
  name: string;
  position: number;
  required: boolean;
  dependencies: ContentStageType[];
}

export class ContentAudienceDefinitionResponseDto {
  audience: ContentAudience;
  name: string;
  minimumAge: number;
  maximumAge: number | null;
  stages: ContentStageDefinitionResponseDto[];
}

export class ContentStudioCapabilitiesResponseDto {
  generation: boolean;
  review: boolean;
  publication: boolean;
  providerAdministration: boolean;
}

export class ContentStudioCatalogResponseDto {
  version: string;
  allAudiencesRequired: boolean;
  audiences: ContentAudienceDefinitionResponseDto[];
  capabilities: ContentStudioCapabilitiesResponseDto;
}
