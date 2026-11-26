import { ContentPackageListItemResponseDto } from "./content-package-response.dto";
import type {
  DashboardData,
  DashboardJobStats,
  DashboardPackageStats,
  DashboardStageStats,
} from "../types";

export class ContentStudioDashboardResponseDto {
  packages: DashboardPackageStats;
  stages: DashboardStageStats;
  jobs: DashboardJobStats;
  recent: ContentPackageListItemResponseDto[];

  static fromData(data: DashboardData): ContentStudioDashboardResponseDto {
    return {
      packages: data.packages,
      stages: data.stages,
      jobs: data.jobs,
      recent: data.recent.map(ContentPackageListItemResponseDto.fromEntity),
    };
  }
}
