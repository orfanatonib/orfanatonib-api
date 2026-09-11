import {
  definitionList,
  paragraph,
  quotedText,
  renderEmailShell,
} from "./layout/email-layout";
import {
  CommentReceivedEmailData,
  ContactReceivedEmailData,
  EmailRenderContext,
  FeedbackReceivedEmailData,
  RenderedEmail,
} from "../types";

const APP = "Orfanatos NIB";

/**
 * E-mails que chegam para a coordenação a partir do site. Vão para caixa
 * coletiva, então não levam saudação nominal.
 */

export const renderContactReceived = (
  data: ContactReceivedEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Novo Contato - ${APP}`,
  html: renderEmailShell({
    title: "Novo contato pelo site",
    logoUrl: context.logoUrl,
    body: [
      paragraph("Alguém enviou uma mensagem pelo formulário de contato."),
      definitionList([
        { label: "Nome", value: data.name },
        { label: "E-mail", value: data.email },
        { label: "Telefone", value: data.phone },
      ]),
      paragraph("<strong>Mensagem</strong>"),
      quotedText(data.message),
    ].join(""),
  }),
  text: [
    "Novo contato pelo site:",
    "",
    `Nome: ${data.name}`,
    `E-mail: ${data.email}`,
    `Telefone: ${data.phone}`,
    "",
    "Mensagem:",
    data.message,
  ].join("\n"),
});

export const renderFeedbackReceived = (
  data: FeedbackReceivedEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Novo feedback do site - ${APP}`,
  html: renderEmailShell({
    title: "Novo feedback do site",
    logoUrl: context.logoUrl,
    body: [
      paragraph("Um visitante deixou um feedback."),
      definitionList([
        { label: "Nome", value: data.name?.trim() || "Não informado" },
        { label: "E-mail", value: data.email?.trim() || "Não informado" },
        {
          label: "Nota",
          value:
            data.rating === undefined ? "Não informada" : `${data.rating} de 5`,
        },
      ]),
      paragraph("<strong>Comentário</strong>"),
      quotedText(data.comment),
    ].join(""),
  }),
  text: [
    "Novo feedback do site:",
    "",
    `Nome: ${data.name?.trim() || "Não informado"}`,
    `E-mail: ${data.email?.trim() || "Não informado"}`,
    `Nota: ${data.rating === undefined ? "Não informada" : `${data.rating} de 5`}`,
    "",
    "Comentário:",
    data.comment,
  ].join("\n"),
});

export const renderCommentReceived = (
  data: CommentReceivedEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Novo comentário no site - ${APP}`,
  html: renderEmailShell({
    title: "Novo comentário no site",
    logoUrl: context.logoUrl,
    body: [
      paragraph("Um comentário foi publicado e aguarda revisão."),
      definitionList([
        { label: "Autor", value: data.authorName },
        { label: "Clubinho", value: data.clubinho?.trim() || "Não informado" },
        {
          label: "Bairro",
          value: data.neighborhood?.trim() || "Não informado",
        },
      ]),
      paragraph("<strong>Comentário</strong>"),
      quotedText(data.comment),
    ].join(""),
  }),
  text: [
    "Novo comentário no site:",
    "",
    `Autor: ${data.authorName}`,
    `Clubinho: ${data.clubinho?.trim() || "Não informado"}`,
    `Bairro: ${data.neighborhood?.trim() || "Não informado"}`,
    "",
    "Comentário:",
    data.comment,
  ].join("\n"),
});
