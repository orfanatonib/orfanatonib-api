import { EmailCalloutTone } from "../constants/email-theme.constants";
import {
  button,
  callout,
  definitionList,
  escapeHtml,
  paragraph,
  renderEmailShell,
  quotedText,
} from "./layout/email-layout";
import {
  EmailRenderContext,
  FeedCommentApprovedEmailData,
  FeedCommentPendingEmailData,
  FeedCommentRejectedEmailData,
  RenderedEmail,
} from "../types";

const APP = "Orfanatos NIB";
const ADMIN_COMMENTS_PATH = "/adm/comentarios-feed";
const FEED_PATH = "/feed-ministerio-orfanatos-nib";

const withPath = (context: EmailRenderContext, path: string): string =>
  `${context.appUrl}${path}`;

/** Caixa coletiva da coordenação: sem saudação nominal e sem o texto do comentário. */
export const renderFeedCommentPending = (
  data: FeedCommentPendingEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const link = withPath(context, ADMIN_COMMENTS_PATH);
  return {
    subject: `Comentário aguardando aprovação - ${APP}`,
    html: renderEmailShell({
      title: "Comentário aguardando aprovação",
      logoUrl: context.logoUrl,
      body: [
        paragraph("Há um comentário novo no feed dos abrigos para revisar."),
        definitionList([
          { label: "Autor", value: data.authorName },
          { label: "Publicação", value: data.postCaption },
        ]),
        paragraph("O comentário só aparece para todos depois de aprovado."),
        button("Revisar comentários", link),
      ].join(""),
    }),
    text: [
      "Há um comentário novo no feed dos abrigos aguardando aprovação.",
      "",
      `Autor: ${data.authorName}`,
      `Publicação: ${data.postCaption}`,
      "",
      `Revisar: ${link}`,
    ].join("\n"),
  };
};

export const renderFeedCommentApproved = (
  data: FeedCommentApprovedEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const link = withPath(context, FEED_PATH);
  return {
    subject: `Seu comentário foi aprovado - ${APP}`,
    html: renderEmailShell({
      title: "Comentário aprovado",
      greetingName: data.userName,
      logoUrl: context.logoUrl,
      body: [
        paragraph(
          `Seu comentário na publicação <strong>${escapeHtml(data.postCaption)}</strong> foi aprovado e já aparece para todos.`,
        ),
        quotedText(data.commentExcerpt),
        button("Ver no feed", link),
      ].join(""),
    }),
    text: [
      `Olá ${data.userName},`,
      "",
      `Seu comentário na publicação "${data.postCaption}" foi aprovado e já aparece para todos.`,
      "",
      `"${data.commentExcerpt}"`,
      "",
      `Ver no feed: ${link}`,
    ].join("\n"),
  };
};

export const renderFeedCommentRejected = (
  data: FeedCommentRejectedEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const link = withPath(context, FEED_PATH);
  return {
    subject: `Seu comentário não foi aprovado - ${APP}`,
    html: renderEmailShell({
      title: "Comentário não aprovado",
      greetingName: data.userName,
      logoUrl: context.logoUrl,
      body: [
        paragraph(
          `Seu comentário na publicação <strong>${escapeHtml(data.postCaption)}</strong> não foi aprovado pela equipe.`,
        ),
        quotedText(data.commentExcerpt),
        callout(
          `<strong>Motivo:</strong> ${escapeHtml(data.reason)}`,
          EmailCalloutTone.WARNING,
        ),
        paragraph("Você pode enviar um novo comentário quando quiser."),
        button("Voltar ao feed", link),
      ].join(""),
    }),
    text: [
      `Olá ${data.userName},`,
      "",
      `Seu comentário na publicação "${data.postCaption}" não foi aprovado pela equipe.`,
      "",
      `"${data.commentExcerpt}"`,
      "",
      `Motivo: ${data.reason}`,
      "",
      `Voltar ao feed: ${link}`,
    ].join("\n"),
  };
};
