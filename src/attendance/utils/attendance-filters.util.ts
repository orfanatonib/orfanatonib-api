import {
  ATTENDANCE_LIMIT_DEFAULT,
  ATTENDANCE_LIMIT_MAX,
  ATTENDANCE_PAGE_DEFAULT,
  ATTENDANCE_SORT_COLUMNS,
} from "../constants";
import { AttendanceFiltersDto } from "../dto/attendance-filters.dto";
import { AttendanceRecordsFilters } from "../types";

type SortField = keyof typeof ATTENDANCE_SORT_COLUMNS;

const isSortField = (value: string | undefined): value is SortField =>
  !!value && value in ATTENDANCE_SORT_COLUMNS;

/**
 * Normaliza o que veio da query string: página, limite e ordenação sempre
 * definidos, e o campo de ordenação restrito ao que o SQL conhece — antes
 * `sortBy` entrava na consulta com um ternário que aceitava qualquer texto.
 */
export const toRecordsFilters = (
  query: AttendanceFiltersDto,
): AttendanceRecordsFilters => ({
  page: Math.max(query.page ?? ATTENDANCE_PAGE_DEFAULT, 1),
  limit: Math.min(
    query.limit ?? ATTENDANCE_LIMIT_DEFAULT,
    ATTENDANCE_LIMIT_MAX,
  ),
  startDate: query.startDate,
  endDate: query.endDate,
  type: query.type,
  category: query.category,
  teamId: query.teamId,
  memberId: query.memberId,
  scheduleId: query.scheduleId,
  memberName: query.memberName?.trim() || undefined,
  sortBy: isSortField(query.sortBy) ? query.sortBy : "createdAt",
  sortOrder: query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
});
