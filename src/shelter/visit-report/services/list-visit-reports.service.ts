import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Request } from "express";
import {
  VisitReportListActor,
  VisitReportRepository,
} from "../visit-report.repository";
import { QueryVisitReportDto } from "../dto/query-visit-report.dto";
import { VisitReportSortBy } from "../enums/visit-report-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { VisitReportEntity } from "../entities/visit-report.entity";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { canAccessReport } from "../utils/visit-report-access.util";
import { AuthContextService } from "src/core/auth/services/auth-context.service";

@Injectable()
export class ListVisitReportsService {
  private readonly logger = new Logger(ListVisitReportsService.name);

  constructor(
    private readonly visitReportRepo: VisitReportRepository,
    private readonly authCtx: AuthContextService,
  ) {}

  /**
   * Lista no escopo do ator. Os filtros por id nunca ampliam o escopo: líder só recebe o que lidera.
   * Sem `page` devolve o array de sempre; com `page`, `{ data, meta }` recortado no banco.
   */
  async execute(
    req: Request,
    query: QueryVisitReportDto = {},
  ): Promise<VisitReportEntity[] | PaginatedResponseDto<VisitReportEntity>> {
    this.logger.log("Listing visit reports");

    const payload = await this.authCtx.tryGetPayload(req);
    const role = payload?.role?.toLowerCase();
    const actor: VisitReportListActor = {
      role: role === "admin" || role === "leader" ? role : null,
      userId: payload?.sub ?? null,
    };

    const { items, total } = await this.visitReportRepo.findFiltered(
      actor,
      query,
    );
    if (!isPaginated(query)) return items;
    return toPaginated(
      items,
      query,
      total,
      query.sortBy ?? VisitReportSortBy.CREATED_AT,
    );
  }

  async findOne(
    id: string,
    actor: ShelterAccessContext,
  ): Promise<VisitReportEntity> {
    this.logger.log(`Finding visit report by ID: ${id}`);

    const report = await this.visitReportRepo.findById(id);
    if (!report || !canAccessReport(actor, report)) {
      throw new NotFoundException(`Visit report with ID ${id} not found`);
    }

    return report;
  }
}
