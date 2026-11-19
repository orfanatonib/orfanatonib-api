import {
  button,
  definitionList,
  escapeHtml,
  paragraph,
  quotedText,
  renderEmailShell,
} from "./layout/email-layout";
import {
  CommentReceivedEmailData,
  ContactReceivedEmailData,
  EmailRenderContext,
  FeedbackReceivedEmailData,
  ImageRejectedEmailData,
  PhotoUploadedEmailData,
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

/** Rota da fila de revisão do admin. */
const ADMIN_IMAGE_SECTIONS_PATH = "/adm/fotos-abrigos";

const describeMedia = (photos: number, videos: number): string => {
  const parts: string[] = [];
  if (photos > 0) parts.push(photos === 1 ? "1 foto" : `${photos} fotos`);
  if (videos > 0) parts.push(videos === 1 ? "1 vídeo" : `${videos} vídeos`);
  return parts.join(" e ") || "Sem arquivos";
};

export const renderPhotoUploaded = (
  data: PhotoUploadedEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const author = data.authorName?.trim() || "Autor não informado";
  const caption = data.caption?.trim() || "Sem legenda";
  const media = describeMedia(data.photoCount, data.videoCount);
  const link = `${context.appUrl}${ADMIN_IMAGE_SECTIONS_PATH}`;
  return {
    subject: `Nova publicação aguardando aprovação - ${APP}`,
    html: renderEmailShell({
      title: "Nova publicação aguardando aprovação",
      logoUrl: context.logoUrl,
      body: [
        paragraph("Alguém enviou uma publicação para o feed de abrigos."),
        definitionList([
          { label: "Enviado por", value: author },
          { label: "Legenda", value: caption },
          { label: "Mídia", value: media },
        ]),
        paragraph(
          "Revise antes de publicar: ela só aparece no feed depois de aprovada.",
        ),
        button("Revisar publicações", link),
      ].join(""),
    }),
    text: [
      "Nova publicação aguardando aprovação no feed de abrigos:",
      "",
      `Enviado por: ${author}`,
      `Legenda: ${caption}`,
      `Mídia: ${media}`,
      "",
      "Revise antes de publicar: ela só aparece no feed depois de aprovada.",
      `Revisar: ${link}`,
    ].join("\n"),
  };
};

/** Ao autor: só o motivo e a legenda; sem dado de terceiros. */
export const renderImageRejected = (
  data: ImageRejectedEmailData,
  context: EmailRenderContext,
): RenderedEmail => {
  const link = `${context.appUrl}/area-do-membro/imagens-abrigo`;
  return {
    subject: `Sua publicação não foi aprovada - ${APP}`,
    html: renderEmailShell({
      title: "Publicação não aprovada",
      greetingName: data.userName,
      logoUrl: context.logoUrl,
      body: [
        paragraph(
          `A equipe revisou a publicação "${escapeHtml(data.postCaption)}" e não pôde aprová-la.`,
        ),
        definitionList([{ label: "Motivo", value: data.reason }]),
        paragraph("Você pode ajustar e enviar uma nova publicação."),
        button("Enviar outra publicação", link),
      ].join(""),
    }),
    text: [
      `Olá, ${data.userName}.`,
      "",
      `A equipe revisou a publicação "${data.postCaption}" e não pôde aprová-la.`,
      `Motivo: ${data.reason}`,
      "",
      `Envie outra publicação: ${link}`,
    ].join("\n"),
  };
};

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
