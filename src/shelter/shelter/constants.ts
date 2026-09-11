import { MediaTargetType } from "src/shared/media/media-target-type.enum";

/** Campo multipart que carrega o JSON do abrigo. */
export const SHELTER_PAYLOAD_FIELD = "shelterData";
/** Campo multipart que carrega o JSON da mídia, no PATCH de imagem. */
export const SHELTER_MEDIA_PAYLOAD_FIELD = "mediaData";

export const SHELTER_ROUTE_PREFIX = "abrigo_";

/**
 * `entityType` gravado na rota do abrigo. Havia três grafias no módulo
 * (`shelterPage`, `ShelterPage`, `ShelterEntity`); esta é a que está no banco,
 * escrita pela criação, e a que a consulta do repositório usa.
 */
export const SHELTER_ROUTE_ENTITY_TYPE = "shelterPage";

export const SHELTER_MEDIA_TARGET = MediaTargetType.Shelter;
export const USER_MEDIA_TARGET = MediaTargetType.User;

export const SHELTER_PAGE_DEFAULT = 1;
export const SHELTER_LIMIT_DEFAULT = 10;
export const SHELTER_LIMIT_MAX = 200;

/**
 * `media_items.title` e `media_items.description` são NOT NULL, mas o payload
 * da mídia os traz como opcionais. O default vive aqui para que nenhum caminho
 * de escrita consiga gravar a foto sem eles.
 */
export const SHELTER_MEDIA_DEFAULT_TITLE = "Foto do Abrigo";
export const SHELTER_MEDIA_DEFAULT_DESCRIPTION = "Imagem principal do abrigo";

export const SHELTER_DEFAULT_ROUTE_DESCRIPTION =
  "Shelter dedicated to caring for children and adolescents";

export const SHELTER_MESSAGES = {
  NOT_FOUND: "Abrigo não encontrado ou fora do seu acesso.",
  ACCESS_DENIED: "Acesso negado.",
  PAYLOAD_REQUIRED: `Dados do abrigo não informados. Use "${SHELTER_PAYLOAD_FIELD}" em form-data ou envie JSON direto.`,
  MEDIA_PAYLOAD_REQUIRED: `Dados da mídia não informados. Use "${SHELTER_MEDIA_PAYLOAD_FIELD}" ou envie os campos direto (title, url).`,
  INVALID_PAYLOAD: "Dados inválidos na requisição.",
  MEDIA_SOURCE_REQUIRED: "É obrigatório informar uma URL ou enviar um arquivo.",
  MEDIA_FILE_MISSING: (
    fieldKey: string | undefined,
    available: string[],
  ): string =>
    `Arquivo não encontrado para o upload. fieldKey: ${fieldKey ?? "(ausente)"}; enviados: ${available.join(", ") || "nenhum"}.`,
  TEAM_OUT_OF_RANGE: (numberTeam: number, quantity: number): string =>
    `numberTeam ${numberTeam} deve estar entre 1 e ${quantity}.`,
  TEAM_DUPLICATED: (numberTeam: number): string =>
    `Equipe ${numberTeam} definida mais de uma vez.`,
  MEMBER_IN_MULTIPLE_TEAMS: (memberId: string): string =>
    `O membro ${memberId} não pode estar em mais de uma equipe.`,
  DELETED: "Shelter removido com sucesso",
} as const;
