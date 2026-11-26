import { UserRole } from "src/core/auth/auth.types";
import { AcceptedJesusFilter } from "./enums/accepted-jesus-filter.enum";
import { ShelteredActiveFilter } from "./enums/sheltered-active-filter.enum";

/**
 * Resolved actor scope used to enforce shelter/team visibility.
 * Built from the authenticated request; never from client-provided input.
 */
export interface ShelteredAccessContext {
  readonly userId: string | null;
  readonly role: UserRole | null;
}

export interface PaginatedRows<TEntity> {
  items: TEntity[];
  total: number;
}

export interface ShelteredSimpleFilters {
  page: number;
  limit: number;
  searchString?: string;
  acceptedJesus: AcceptedJesusFilter;
  active: ShelteredActiveFilter;
}
