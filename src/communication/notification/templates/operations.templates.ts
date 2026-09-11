import { EmailCalloutTone } from "../constants/email-theme.constants";
import {
  button,
  callout,
  definitionList,
  escapeHtml,
  paragraph,
  renderEmailShell,
} from "./layout/email-layout";
import {
  EmailRenderContext,
  EventNoticeEmailData,
  PagelaReminderEmailData,
  RenderedEmail,
  TeamAssignmentChangedEmailData,
  VisitReportReminderEmailData,
} from "../types";

const APP = "Orfanatos NIB";

export const renderEventNotice = (
  data: EventNoticeEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const rows = [{ label: "Data", value: data.date }];
  if (data.location) rows.push({ label: "Local", value: data.location });

  return {
    subject: data.subjectLine,
    html: renderEmailShell({
      title: data.title,
      logoUrl: context.logoUrl,
      body: [
        paragraph(
          `O evento <strong>${escapeHtml(data.title)}</strong> ${escapeHtml(data.actionLabel)}.`,
        ),
        definitionList(rows),
        data.description ? paragraph(escapeHtml(data.description)) : "",
        button("Ver no site", `${context.appUrl}/eventos`),
      ].join(""),
    }),
    text: [
      `O evento "${data.title}" ${data.actionLabel}.`,
      "",
      `Data: ${data.date}`,
      data.location ? `Local: ${data.location}` : "",
      data.description ? `Descrição: ${data.description}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
};

export const renderTeamAssignmentChanged = (
  data: TeamAssignmentChangedEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const headline = data.assigned
    ? `Você agora faz parte da <strong>Equipe ${data.teamNumber}</strong> do abrigo <strong>${escapeHtml(data.shelterName)}</strong>.`
    : `Você não faz mais parte da <strong>Equipe ${data.teamNumber}</strong> do abrigo <strong>${escapeHtml(data.shelterName)}</strong>.`;

  return {
    subject: data.assigned
      ? `Você entrou em uma equipe - ${APP}`
      : `Alteração na sua equipe - ${APP}`,
    html: renderEmailShell({
      title: data.assigned ? "Nova equipe" : "Alteração de equipe",
      greetingName: data.userName,
      logoUrl: context.logoUrl,
      body: [
        paragraph(headline),
        paragraph("Confira seus dados e o calendário do abrigo na plataforma."),
        button("Abrir plataforma", context.appUrl),
      ].join(""),
    }),
    text: [
      `Olá ${data.userName},`,
      "",
      data.assigned
        ? `Você agora faz parte da Equipe ${data.teamNumber} do abrigo ${data.shelterName}.`
        : `Você não faz mais parte da Equipe ${data.teamNumber} do abrigo ${data.shelterName}.`,
      "",
      `Acesse: ${context.appUrl}`,
    ].join("\n"),
  };
};

export const renderPagelaReminder = (
  data: PagelaReminderEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Pagelas pendentes - ${APP}`,
  html: renderEmailShell({
    title: "Pagelas pendentes",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph(
        `O abrigo <strong>${escapeHtml(data.shelterName)}</strong> tem <strong>${data.pendingCount}</strong> pagela(s) sem lançamento em ${escapeHtml(data.referenceLabel)}.`,
      ),
      callout(
        "O lançamento em dia é o que mantém o acompanhamento das crianças confiável.",
        EmailCalloutTone.WARNING,
      ),
      button("Lançar pagelas", `${context.appUrl}/pagelas`),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    `O abrigo ${data.shelterName} tem ${data.pendingCount} pagela(s) sem lançamento em ${data.referenceLabel}.`,
    `Lance em: ${context.appUrl}/pagelas`,
  ].join("\n"),
});

export const renderVisitReportReminder = (
  data: VisitReportReminderEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Relatório de visita pendente - ${APP}`,
  html: renderEmailShell({
    title: "Relatório de visita pendente",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph(
        `O abrigo <strong>${escapeHtml(data.shelterName)}</strong> está sem relatório de visita em ${escapeHtml(data.referenceLabel)}.`,
      ),
      button("Enviar relatório", `${context.appUrl}/relatorios-visita`),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    `O abrigo ${data.shelterName} está sem relatório de visita em ${data.referenceLabel}.`,
    `Envie em: ${context.appUrl}/relatorios-visita`,
  ].join("\n"),
});
