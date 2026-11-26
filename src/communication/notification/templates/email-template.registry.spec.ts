import { EmailTemplateKey } from "../enums/email-template-key.enum";
import {
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_KEYS,
  renderEmail,
} from "./email-template.registry";
import { EMAIL_PREVIEW_SAMPLES } from "../preview/email-preview.samples";
import { EmailRenderContext } from "../types";

const context: EmailRenderContext = {
  appUrl: "https://www.orfanatonib.com",
  logoUrl: "https://cdn.test/logo.png",
};

const renderSample = (key: EmailTemplateKey) =>
  renderEmail(key, EMAIL_PREVIEW_SAMPLES[key], context);

describe("catálogo de templates", () => {
  it("tem um renderizador para cada chave do enum", () => {
    expect(EMAIL_TEMPLATE_KEYS.sort()).toEqual(
      Object.values(EmailTemplateKey).sort(),
    );
  });

  it.each(EMAIL_TEMPLATE_KEYS)("%s produz assunto, html e texto", (key) => {
    const rendered = renderSample(key);

    expect(rendered.subject.length).toBeGreaterThan(0);
    expect(rendered.text.length).toBeGreaterThan(0);
    expect(rendered.html).toContain("<!DOCTYPE html>");
    expect(rendered.html).toContain("</html>");
  });

  it.each(EMAIL_TEMPLATE_KEYS)(
    "%s não deixa placeholder sem preencher",
    (key) => {
      const rendered = renderSample(key);

      expect(rendered.html).not.toContain("undefined");
      expect(rendered.html).not.toContain("[object Object]");
      expect(rendered.text).not.toContain("undefined");
    },
  );

  it.each(EMAIL_TEMPLATE_KEYS)("%s usa o logo quando há um", (key) => {
    expect(renderSample(key).html).toContain("https://cdn.test/logo.png");
  });

  it("cai no nome da instituição quando não há logo", () => {
    const rendered = renderEmail(
      EmailTemplateKey.PASSWORD_RESET,
      EMAIL_PREVIEW_SAMPLES[EmailTemplateKey.PASSWORD_RESET],
      { appUrl: context.appUrl },
    );

    expect(rendered.html).not.toContain("<img");
    expect(rendered.html).toContain("Orfanatos NIB");
  });

  it("o registro expõe exatamente os renderizadores do enum", () => {
    for (const key of Object.values(EmailTemplateKey)) {
      expect(typeof EMAIL_TEMPLATES[key]).toBe("function");
    }
  });
});

describe("conteúdo específico", () => {
  it("a recuperação de senha leva o link e a validade", () => {
    const rendered = renderSample(EmailTemplateKey.PASSWORD_RESET);

    expect(rendered.html).toContain("/recuperar-senha/token-de-exemplo");
    expect(rendered.html).toContain("30 minutos");
    expect(rendered.text).toContain("/recuperar-senha/token-de-exemplo");
  });

  it("a confirmação de e-mail leva o link e a validade", () => {
    const rendered = renderSample(EmailTemplateKey.EMAIL_VERIFICATION);

    expect(rendered.html).toContain("/verificar-email/token-de-exemplo");
    expect(rendered.html).toContain("24 horas");
  });

  it("o aviso de equipe muda o texto quando o vínculo é removido", () => {
    const assigned = renderEmail(
      EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED,
      {
        ...EMAIL_PREVIEW_SAMPLES[EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED],
        assigned: true,
      },
      context,
    );
    const removed = renderEmail(
      EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED,
      {
        ...EMAIL_PREVIEW_SAMPLES[EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED],
        assigned: false,
      },
      context,
    );

    expect(assigned.html).toContain("Você agora faz parte");
    expect(removed.html).toContain("Você não faz mais parte");
    expect(assigned.subject).not.toBe(removed.subject);
  });

  it("o evento sem local e sem descrição não quebra o texto", () => {
    const rendered = renderEmail(
      EmailTemplateKey.EVENT_NOTICE,
      {
        title: "Reunião",
        date: "01/01/2027",
        actionLabel: "foi criado",
        subjectLine: "Novo evento",
      },
      context,
    );

    expect(rendered.text).not.toContain("Local:");
    expect(rendered.text).not.toContain("Descrição:");
    expect(rendered.subject).toBe("Novo evento");
  });

  it("o feedback sem nome, e-mail e nota mostra 'não informado'", () => {
    const rendered = renderEmail(
      EmailTemplateKey.FEEDBACK_RECEIVED,
      { comment: "Só o comentário." },
      context,
    );

    expect(rendered.html).toContain("Não informado");
    expect(rendered.html).toContain("Não informada");
  });
});

describe("segurança do HTML", () => {
  it("escapa o que veio do usuário no corpo do e-mail", () => {
    const rendered = renderEmail(
      EmailTemplateKey.CONTACT_RECEIVED,
      {
        name: "<script>alert(1)</script>",
        email: "a@b.test",
        phone: "999",
        message: "<img src=x onerror=alert(2)>",
      },
      context,
    );

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("escapa o nome do abrigo vindo do cadastro", () => {
    const rendered = renderEmail(
      EmailTemplateKey.PAGELA_REMINDER,
      {
        userName: "Maria",
        shelterName: "<script>alert(1)</script>",
        referenceLabel: "a visita 1",
        pendingCount: 2,
      },
      context,
    );

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("escapa o título do evento", () => {
    const rendered = renderEmail(
      EmailTemplateKey.EVENT_NOTICE,
      {
        title: "<b>Festa</b>",
        date: "01/01/2027",
        actionLabel: "foi criado",
        subjectLine: "Novo evento",
      },
      context,
    );

    expect(rendered.html).not.toContain("<b>Festa</b>");
    expect(rendered.html).toContain("&lt;b&gt;Festa");
  });

  it("escapa também o nome na saudação", () => {
    const rendered = renderEmail(
      EmailTemplateKey.PASSWORD_CHANGED,
      { userName: '"><b>injetado</b>' },
      context,
    );

    expect(rendered.html).not.toContain("<b>injetado</b>");
    expect(rendered.html).toContain("&lt;b&gt;injetado");
  });
});
