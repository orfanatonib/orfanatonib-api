import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import type { VisitReportEntity } from "../entities/visit-report.entity";

/** Admin vê tudo; líder só os relatórios das equipes que lidera. */
export const canAccessReport = (
  actor: ShelterAccessContext,
  report: VisitReportEntity,
): boolean => {
  if (actor.role === UserRole.ADMIN) return true;
  if (actor.role !== UserRole.LEADER || !actor.userId) return false;
  return (report.schedule?.team?.leaders ?? []).some(
    (leader) => leader.user?.id === actor.userId,
  );
};

export const filterReportsForActor = (
  actor: ShelterAccessContext,
  reports: VisitReportEntity[],
): VisitReportEntity[] =>
  reports.filter((report) => canAccessReport(actor, report));
