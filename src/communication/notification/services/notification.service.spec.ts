import { Test } from "@nestjs/testing";
import { NotificationService } from "./notification.service";
import { EmailDispatchService } from "./email-dispatch.service";
import { EmailTemplateKey } from "../enums/email-template-key.enum";

const contact = {
  name: "João",
  email: "joao@test",
  phone: "92999990000",
  message: "Olá",
};

describe("NotificationService", () => {
  const dispatcher = { dispatch: jest.fn(), appUrl: jest.fn() };

  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailDispatchService, useValue: dispatcher },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(NotificationService);

    dispatcher.dispatch.mockResolvedValue(undefined);
    dispatcher.appUrl.mockReturnValue("https://app.test");
  });

  it.each([
    [
      "recuperação de senha",
      () => service.sendPasswordResetEmail("a@test", "Maria", "link", 30),
      EmailTemplateKey.PASSWORD_RESET,
    ],
    [
      "senha alterada",
      () => service.sendPasswordChangedEmail("a@test", "Maria"),
      EmailTemplateKey.PASSWORD_CHANGED,
    ],
    [
      "confirmação de e-mail",
      () => service.sendEmailVerification("a@test", "Maria", "link", 24),
      EmailTemplateKey.EMAIL_VERIFICATION,
    ],
    [
      "conta aprovada",
      () => service.sendAccountApproved("a@test", "Maria"),
      EmailTemplateKey.ACCOUNT_APPROVED,
    ],
  ])("%s usa o template certo", async (_label, call, expectedKey) => {
    await call();

    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expectedKey,
      expect.any(Object),
      ["a@test"],
    );
  });

  it("feedback e comentário vão para a lista de admins", async () => {
    await service.sendFeedbackNotification({ comment: "c" }, ["x@test"]);
    await service.sendCommentNotification({ authorName: "Ana", comment: "c" }, [
      "x@test",
      "y@test",
    ]);

    expect(dispatcher.dispatch).toHaveBeenNthCalledWith(
      1,
      EmailTemplateKey.FEEDBACK_RECEIVED,
      expect.any(Object),
      ["x@test"],
    );
    expect(dispatcher.dispatch).toHaveBeenNthCalledWith(
      2,
      EmailTemplateKey.COMMENT_RECEIVED,
      expect.any(Object),
      ["x@test", "y@test"],
    );
  });

  it("o lembrete repassa as opções de deduplicação", async () => {
    await service.sendPagelaReminder(
      "a@test",
      {
        userName: "Maria",
        shelterName: "Abrigo",
        referenceLabel: "a visita 1",
        pendingCount: 2,
      },
      { dedupeKey: "pagela:1" },
    );

    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      EmailTemplateKey.PAGELA_REMINDER,
      expect.any(Object),
      ["a@test"],
      { dedupeKey: "pagela:1" },
    );
  });

  describe("contato", () => {
    it("envia o e-mail para a coordenação", async () => {
      await service.sendContactNotification(contact, ["admin@test"]);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        EmailTemplateKey.CONTACT_RECEIVED,
        contact,
        ["admin@test"],
      );
    });

    it("sem destinatário, não deixa de chamar o dispatcher", async () => {
      await service.sendContactNotification(contact);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        EmailTemplateKey.CONTACT_RECEIVED,
        contact,
        [],
      );
    });
  });

  it("expõe o endereço do frontend para quem precisa montar link", () => {
    expect(service.appUrl()).toBe("https://app.test");
  });

  describe("cada acontecimento dispara o template certo para os destinatários certos", () => {
    const data = {} as never;
    const cases: Array<
      [
        string,
        EmailTemplateKey,
        (svc: NotificationService) => Promise<void>,
        string[],
      ]
    > = [
      [
        "sendPasswordResetEmail",
        EmailTemplateKey.PASSWORD_RESET,
        (s) => s.sendPasswordResetEmail("a@x", "A", "l", 30),
        ["a@x"],
      ],
      [
        "sendPasswordChangedEmail",
        EmailTemplateKey.PASSWORD_CHANGED,
        (s) => s.sendPasswordChangedEmail("a@x", "A"),
        ["a@x"],
      ],
      [
        "sendEmailVerification",
        EmailTemplateKey.EMAIL_VERIFICATION,
        (s) => s.sendEmailVerification("a@x", "A", "l", 24),
        ["a@x"],
      ],
      [
        "sendAccountApproved",
        EmailTemplateKey.ACCOUNT_APPROVED,
        (s) => s.sendAccountApproved("a@x", "A"),
        ["a@x"],
      ],
      [
        "sendContactNotification",
        EmailTemplateKey.CONTACT_RECEIVED,
        (s) => s.sendContactNotification(data, ["c@x"]),
        ["c@x"],
      ],
      [
        "sendFeedbackNotification",
        EmailTemplateKey.FEEDBACK_RECEIVED,
        (s) => s.sendFeedbackNotification(data, ["c@x"]),
        ["c@x"],
      ],
      [
        "sendCommentNotification",
        EmailTemplateKey.COMMENT_RECEIVED,
        (s) => s.sendCommentNotification(data, ["c@x"]),
        ["c@x"],
      ],
      [
        "sendPhotoUploadedNotification",
        EmailTemplateKey.PHOTO_UPLOADED,
        (s) =>
          s.sendPhotoUploadedNotification({ caption: "x", photoCount: 2 }, [
            "c@x",
          ]),
        ["c@x"],
      ],
      [
        "sendEventNotification",
        EmailTemplateKey.EVENT_NOTICE,
        (s) => s.sendEventNotification(data, ["c@x", "d@x"]),
        ["c@x", "d@x"],
      ],
      [
        "sendTeamAssignmentChanged",
        EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED,
        (s) => s.sendTeamAssignmentChanged("a@x", data),
        ["a@x"],
      ],
      [
        "sendPagelaReminder",
        EmailTemplateKey.PAGELA_REMINDER,
        (s) => s.sendPagelaReminder("a@x", data, { dedupeKey: "k" } as never),
        ["a@x"],
      ],
      [
        "sendVisitReportReminder",
        EmailTemplateKey.VISIT_REPORT_REMINDER,
        (s) =>
          s.sendVisitReportReminder("a@x", data, { dedupeKey: "k" } as never),
        ["a@x"],
      ],
    ];

    it.each(cases)(
      "%s usa o template %s",
      async (_name, key, call, recipients) => {
        await call(service);
        expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
        const [usedKey, , usedRecipients] = dispatcher.dispatch.mock
          .calls[0] as [string, unknown, string[]];
        expect(usedKey).toBe(key);
        expect(usedRecipients).toEqual(recipients);
      },
    );

    it("todo EmailTemplateKey tem um método de envio (nenhum template órfão)", () => {
      expect(new Set(cases.map(([, key]) => key))).toEqual(
        new Set(Object.values(EmailTemplateKey)),
      );
    });
  });
});
