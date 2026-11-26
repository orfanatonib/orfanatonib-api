import { BadRequestException, Injectable } from "@nestjs/common";

import { ContentStudioDashboardResponseDto } from "../dto/content-studio-dashboard-response.dto";
import { ContentStudioDashboardRepository } from "../dashboard/content-studio-dashboard.repository";
import { QueryContentStudioDashboardDto } from "../dto/query-content-studio-dashboard.dto";

@Injectable()
export class GetContentStudioDashboardService {
  constructor(private readonly dashboard: ContentStudioDashboardRepository) {}

  async execute(
    query: QueryContentStudioDashboardDto = {},
  ): Promise<ContentStudioDashboardResponseDto> {
    if (
      query.startDate &&
      query.endDate &&
      new Date(query.startDate).getTime() > new Date(query.endDate).getTime()
    ) {
      throw new BadRequestException(
        "A data inicial deve ser anterior ou igual à data final",
      );
    }
    return ContentStudioDashboardResponseDto.fromData(
      await this.dashboard.getDashboard(query),
    );
  }
}
