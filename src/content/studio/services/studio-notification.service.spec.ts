import { InboxNotificationType } from "src/communication/inbox/enums/inbox-notification-type.enum";

import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { StudioNotificationService } from "./studio-notification.service";

const decision = (id: string, type: ContentReviewDecisionType, at: string) => ({
  id,
  decision: type,
  decidedAt: new Date(at),
});

const pkg = (stageStatus: ContentStageStatus, decisions: unknown[]) =>
  ({
    id: "p1",
    theme: "Zaqueu",
    tracks: [
      {
        audience: "CHILD",
        stages: [
          {
            id: "s1",
            stageType: "LESSON",
            required: true,
            status: stageStatus,
            currentVersionId: "v1",
            reviewDecisions: decisions,
          },
        ],
      },
    ],
  }) as never;

function setup() {
  const inbox = { notifyAdmins: jest.fn().mockResolvedValue(1) };
  const packages = { findThemeById: jest.fn().mockResolvedValue("Zaqueu") };
  return {
    inbox,
    svc: new StudioNotificationService(inbox as never, packages as never),
  };
}

describe("StudioNotificationService", () => {
  it("envio: aviso 'enviado' por categoria, com chave do evento", async () => {
    const { svc, inbox } = setup();
    await svc.submitted(
      pkg(ContentStageStatus.IN_REVIEW, [
        decision(
          "d1",
          ContentReviewDecisionType.SUBMITTED,
          "2026-11-22T10:00:00Z",
        ),
      ]),
      undefined,
      "u1",
    );
    expect(inbox.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(inbox.notifyAdmins.mock.calls[0][0]).toMatchObject({
      type: InboxNotificationType.SUBMITTED_FOR_REVIEW,
      targetAudience: "CHILD",
      dedupeKey: expect.stringContaining(":d1"),
    });
  });

  it("envio depois de um ajuste vira 'reenviado'", async () => {
    const { svc, inbox } = setup();
    await svc.submitted(
      pkg(ContentStageStatus.IN_REVIEW, [
        decision(
          "d1",
          ContentReviewDecisionType.SUBMITTED,
          "2026-11-22T10:00:00Z",
        ),
        decision(
          "d2",
          ContentReviewDecisionType.CHANGES_REQUESTED,
          "2026-11-22T11:00:00Z",
        ),
        decision(
          "d3",
          ContentReviewDecisionType.SUBMITTED,
          "2026-11-22T12:00:00Z",
        ),
      ]),
      undefined,
      "u1",
    );
    expect(inbox.notifyAdmins.mock.calls[0][0].type).toBe(
      InboxNotificationType.RESUBMITTED_FOR_REVIEW,
    );
  });

  it("categorias fora da escolha e sem item em revisão não geram aviso", async () => {
    const { svc, inbox } = setup();
    await svc.submitted(pkg(ContentStageStatus.DRAFT, []), undefined, "u1");
    await svc.submitted(
      pkg(ContentStageStatus.IN_REVIEW, []),
      ["TEEN" as never],
      "u1",
    );
    expect(inbox.notifyAdmins).not.toHaveBeenCalled();
  });

  it("ajuste pedido e aprovação usam o id da decisão como chave", async () => {
    const { svc, inbox } = setup();
    await svc.changesRequested(
      pkg(ContentStageStatus.CHANGES_REQUESTED, [
        decision(
          "d9",
          ContentReviewDecisionType.CHANGES_REQUESTED,
          "2026-11-22T10:00:00Z",
        ),
      ]),
      "s1",
      "r1",
    );
    await svc.approved(
      pkg(ContentStageStatus.APPROVED, [
        decision(
          "d10",
          ContentReviewDecisionType.APPROVED,
          "2026-11-22T10:00:00Z",
        ),
      ]),
      "s1",
      "r1",
    );
    expect(inbox.notifyAdmins.mock.calls[0][0]).toMatchObject({
      type: InboxNotificationType.CHANGES_REQUESTED,
      targetStage: "LESSON",
    });
    expect(inbox.notifyAdmins.mock.calls[1][0].dedupeKey).toContain(":d10");
  });

  it("concluir item devolvido que voltou sozinho avisa 'reenviado'; item comum só avisa ao fechar a categoria", async () => {
    const { svc, inbox } = setup();
    await svc.productionCompleted(
      pkg(ContentStageStatus.IN_REVIEW, [
        decision(
          "d3",
          ContentReviewDecisionType.SUBMITTED,
          "2026-11-22T12:00:00Z",
        ),
      ]),
      "s1",
      "u1",
    );
    expect(inbox.notifyAdmins.mock.calls[0][0].type).toBe(
      InboxNotificationType.RESUBMITTED_FOR_REVIEW,
    );
    await svc.productionCompleted(
      pkg(ContentStageStatus.PRODUCER_APPROVED, []),
      "s1",
      "u1",
    );
    expect(inbox.notifyAdmins.mock.calls[1][0].type).toBe(
      InboxNotificationType.PRODUCTION_COMPLETED,
    );
    await svc.productionCompleted(
      pkg(ContentStageStatus.DRAFT, []),
      "s1",
      "u1",
    );
    expect(inbox.notifyAdmins).toHaveBeenCalledTimes(2);
  });

  it("publicação: um aviso por categoria; geração: chave pelo job", async () => {
    const { svc, inbox } = setup();
    await svc.published("p1", ["CHILD", "TEEN"], "pub1", "u1");
    expect(inbox.notifyAdmins).toHaveBeenCalledTimes(2);
    await svc.generationFinished("p1", "job1", true, "u1");
    expect(inbox.notifyAdmins.mock.calls[2][0]).toMatchObject({
      type: InboxNotificationType.GENERATION_FAILED,
      dedupeKey: "studio:GENERATION_FAILED:job1",
    });
  });
});
