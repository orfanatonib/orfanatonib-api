import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { EmailOutboxService } from "../outbox/email-outbox.service";
import { EmailDispatchService } from "../services/email-dispatch.service";
import { renderImageRejected, renderPhotoUploaded } from "./inbound.templates";

const context = { appUrl: "https://www.orfanatonib.com" };

describe("e-mail 'nova publicação' (aos admins)", () => {
  const out = renderPhotoUploaded(
    {
      authorName: "Maria S.",
      caption: "Visita de sábado",
      photoCount: 2,
      videoCount: 1,
    },
    context,
  );

  it("leva autor (só nome), legenda, contagem de fotos e vídeo e o link da fila", () => {
    for (const body of [out.html, out.text]) {
      expect(body).toContain("Maria S.");
      expect(body).toContain("Visita de sábado");
      expect(body).toContain("2 fotos e 1 vídeo");
      expect(body).toContain("https://www.orfanatonib.com/adm/fotos-abrigos");
    }
    expect(out.subject).toContain("aguardando aprovação");
  });

  it("autoria desconhecida e sem legenda não quebram, e não há e-mail/telefone", () => {
    const anon = renderPhotoUploaded(
      { authorName: null, caption: " ", photoCount: 1, videoCount: 0 },
      context,
    );
    expect(anon.text).toContain("Autor não informado");
    expect(anon.text).toContain("1 foto");
    expect(anon.text).not.toMatch(/@\w|\d{4,}-?\d{4}/);
  });
});

describe("e-mail 'publicação reprovada' (ao autor)", () => {
  it("saúda o autor, mostra o motivo e leva à área de envio; escapa HTML do motivo", () => {
    const out = renderImageRejected(
      { userName: "Maria", postCaption: "Visita", reason: "<b>rosto</b> visível" },
      context,
    );
    expect(out.html).toContain("Olá <strong>Maria</strong>");
    expect(out.html).not.toContain("<b>rosto</b>");
    expect(out.text).toContain("Motivo: <b>rosto</b> visível");
    expect(out.html).toContain("/area-do-membro/imagens-abrigo");
  });
});

describe("flag própria das notificações de publicação", () => {
  const outbox = { enqueue: jest.fn(), recordSkipped: jest.fn() };
  const flags = { isEnabledOrDefault: jest.fn() };
  let service: EmailDispatchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailDispatchService,
        { provide: EmailOutboxService, useValue: outbox },
        { provide: GetFeatureFlagsService, useValue: flags },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    moduleRef.useLogger(false);
    service = moduleRef.get(EmailDispatchService);
    outbox.enqueue.mockResolvedValue([]);
    outbox.recordSkipped.mockResolvedValue(undefined);
  });

  const send = () =>
    service.dispatch(
      EmailTemplateKey.IMAGE_REJECTED_NOTIFICATION,
      { userName: "Maria", postCaption: "Visita", reason: "motivo" },
      ["maria@x.com"],
    );

  it("ligada: enfileira; desligada: não envia nada", async () => {
    flags.isEnabledOrDefault.mockResolvedValue(true);
    await send();
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);

    outbox.enqueue.mockClear();
    flags.isEnabledOrDefault.mockImplementation(
      async (key: string) => key !== "email_image_rejected_notification",
    );
    await send();
    expect(outbox.enqueue).not.toHaveBeenCalled();
    expect(flags.isEnabledOrDefault).toHaveBeenCalledWith(
      "email_image_rejected_notification",
      expect.anything(),
    );
    expect(FeatureFlagKeys.EMAIL_DELIVERY).toBe("email_delivery");
  });
});
