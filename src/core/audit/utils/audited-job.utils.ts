import { AuditActionType, AuditOutcome } from "../enums";
import { ActionBoundaryService } from "../services/action-boundary.service";

/**
 * Roda um job agendado como ação auditada (plano 12, T4.3).
 *
 * Sem o `boundary` (testes, bootstrap sem auditoria) só executa. `outcomeOf`
 * devolve `null` quando a passada não fez nada — um job de minuto em minuto
 * sem trabalho não deve virar um evento por minuto.
 */
export function runAuditedJob<T>(
  boundary: ActionBoundaryService | undefined,
  jobName: string,
  execute: () => Promise<T>,
  outcomeOf: (result: T) => AuditOutcome | null = () => AuditOutcome.Succeeded,
): Promise<T> {
  if (!boundary) return execute();
  return boundary.run(
    { actionType: AuditActionType.ScheduledJob, actionName: jobName, jobName },
    execute,
    outcomeOf,
  );
}
