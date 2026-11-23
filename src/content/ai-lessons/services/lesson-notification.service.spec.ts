import { InboxNotificationType } from "src/communication/inbox/enums/inbox-notification-type.enum";
import { LessonStageType } from "../enums/lesson.enums";
import { LessonWorkflowAction } from "../enums/lesson-failure-code.enum";
import { LessonNotificationService } from "./lesson-notification.service";

function setup(
  findLessonById = jest.fn().mockResolvedValue({ theme: "Zaqueu" }),
) {
  const inbox = { notifyAdmins: jest.fn().mockResolvedValue(1) };
  const svc = new LessonNotificationService(
    { findLessonById } as never,
    inbox as never,
  );
  return { inbox, svc };
}

describe("LessonNotificationService", () => {
  it("avisa só as ações do fluxo que importam para os admins", async () => {
    const { svc, inbox } = setup();
    await svc.workflow(LessonWorkflowAction.SUBMIT_PACKAGE, "l1", "u1");
    await svc.workflow(LessonWorkflowAction.APPROVE_STAGE, "l1", "u1", {
      stage: LessonStageType.LESSON,
    });
    await svc.workflow(LessonWorkflowAction.SAVE_CONTENT, "l1", "u1");
    expect(inbox.notifyAdmins).toHaveBeenCalledTimes(2);
    expect(inbox.notifyAdmins.mock.calls[0][0]).toMatchObject({
      type: InboxNotificationType.SUBMITTED_FOR_REVIEW,
      label: "Zaqueu",
      targetId: "l1",
    });
  });

  it("geração: concluída e falha viram avisos distintos", async () => {
    const { svc, inbox } = setup();
    await svc.generationFinished("l1", LessonStageType.LESSON, false);
    await svc.generationFinished("l1", LessonStageType.LESSON, true);
    expect(inbox.notifyAdmins.mock.calls.map(([call]) => call.type)).toEqual([
      InboxNotificationType.GENERATION_COMPLETED,
      InboxNotificationType.GENERATION_FAILED,
    ]);
  });

  it("nunca lança, nem se a lição não puder ser lida", async () => {
    const { svc, inbox } = setup(jest.fn().mockRejectedValue(new Error("db")));
    await expect(
      svc.workflow(LessonWorkflowAction.PUBLISH, "l1", "u1"),
    ).resolves.toBeUndefined();
    expect(inbox.notifyAdmins).not.toHaveBeenCalled();
  });
});
