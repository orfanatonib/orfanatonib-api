import { Controller, Post, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { ReconcileMediaQueryDto } from "./media-reconciliation.dto";
import { MediaReconciliationService } from "./media-reconciliation.service";
import type { MediaReconciliationReport } from "./media-storage.types";

@Controller("media-storage")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class MediaReconciliationController {
  constructor(private readonly reconciliation: MediaReconciliationService) {}

  /** Compara bucket × banco. Por padrão só relata (dry-run); `dryRun=false` remove órfãos antigos. */
  @Post("reconcile")
  reconcile(
    @Query() query: ReconcileMediaQueryDto,
  ): Promise<MediaReconciliationReport> {
    return this.reconciliation.reconcile({
      dryRun: query.dryRun ?? true,
      minAgeHours: query.minAgeHours,
    });
  }
}
