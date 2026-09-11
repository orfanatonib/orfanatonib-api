import { UserRole } from "src/core/auth/auth.types";
import { ShelterEntity } from "./entities/shelter.entity/shelter.entity";

/**
 * Escopo do ator, resolvido a partir da requisição autenticada.
 * Nunca vem de dado enviado pelo cliente.
 */
export interface ShelterAccessContext {
  readonly userId: string | null;
  readonly role: UserRole | null;
}

export interface PaginatedRows<TEntity> {
  items: TEntity[];
  total: number;
}

/** Arquivos enviados, indexados pelo nome do campo multipart. */
export type UploadedFilesDict = Record<string, Express.Multer.File>;

/** Abrigo já carregado com a mídia anexada para a resposta. */
export type ShelterWithMedia = ShelterEntity;

/** Linhas do SQL cru usado para remontar o abrigo dentro de uma transação. */
export interface ShelterRow {
  id: string;
  name: string;
  description: string | null;
  teamsQuantity: number | null;
  createdAt: Date;
  updatedAt: Date;
  address_id: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  complement: string | null;
  address_createdAt: Date;
  address_updatedAt: Date;
}

export interface TeamRow {
  id: string;
  numberTeam: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileRow {
  id: string;
  team_id: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  user_active: boolean;
  completed: boolean;
  commonUser: boolean;
  role: UserRole;
}
