export interface StudioPublicationRouteOptions { routePathSource?: string; routeImageUrl?: string; }
export interface StudioPublicationSearch { searchString?: string; limit?: number; }
export interface StudioPublicationDuplicateQuery { title: string; weekNumber: number | null; special: boolean; excludePageId?: string | null; }
