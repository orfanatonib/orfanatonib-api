# Lembretes diários (`src/shelter/reminders`)

Job `daily-reminders` (cron diário de manhã, `REMINDER_CONFIG.CRON_HOUR`), registrado como ação auditada (`runAuditedJob`). Não há endpoint HTTP.

| Lembrete | Quem recebe | Quando | Flag do e-mail |
|---|---|---|---|
| Relatório de visita | cada líder da equipe da visita passada sem relatório | visitas entre `REMINDER_LOOKBACK_DAYS` e `REMINDER_GRACE_DAYS` atrás | `email_visit_report_reminder` |
| Pagelas | líderes dos abrigos com acolhidos sem pagela na visita mais recente | só se alguma pagela daquela visita já foi lançada (senão a visita pode não ter ocorrido) | `email_pagela_reminder` |

## Garantias
- **Idempotência:** a chave de dedupe do outbox (`visitReportDedupeKey`/`pagelaDedupeKey`: visita × destinatário) impede cobrar a mesma pendência todo dia.
- **Flag desligada** (`email_delivery` ou a do tipo): o aviso vai para o outbox como `skipped`, deixando o rastro.
- **Isolamento:** a falha de um destinatário é registrada e os demais seguem; ao final a passada acusa `Failed` (`N aviso(s) falharam`). A falha de um lembrete também não impede o outro.
- **Várias instâncias (decisão):** não há lock distribuído. Duas instâncias rodando o mesmo cron geram os mesmos `dedupeKey`, e o outbox descarta o segundo; o custo é só uma consulta repetida. Se o custo importar, trocar por `GET_LOCK` do MySQL.

Testes: `services/reminders.spec.ts` (12 casos).
