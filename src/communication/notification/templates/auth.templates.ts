import { EmailCalloutTone } from "../constants/email-theme.constants";
import {
  button,
  callout,
  fallbackLink,
  paragraph,
  renderEmailShell,
} from "./layout/email-layout";
import {
  AccountApprovedEmailData,
  EmailRenderContext,
  EmailVerificationEmailData,
  PasswordChangedEmailData,
  PasswordResetEmailData,
  RenderedEmail,
} from "../types";

const APP = "Orfanatos NIB";

export const renderPasswordReset = (
  data: PasswordResetEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Recuperação de Senha - ${APP}`,
  html: renderEmailShell({
    title: "Recuperação de Senha",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph("Recebemos uma solicitação para redefinir sua senha."),
      paragraph("Clique no botão abaixo para criar uma nova senha:"),
      button("Redefinir Senha", data.resetLink),
      fallbackLink(data.resetLink),
      callout(
        `Este link é válido por <strong>${data.ttlMinutes} minutos</strong>. Se não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.`,
        EmailCalloutTone.WARNING,
      ),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    "Recebemos uma solicitação para redefinir sua senha.",
    `Acesse: ${data.resetLink}`,
    "",
    `Este link vale por ${data.ttlMinutes} minutos.`,
    "Se não foi você quem pediu, ignore este e-mail.",
  ].join("\n"),
});

export const renderPasswordChanged = (
  data: PasswordChangedEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Senha Alterada com Sucesso - ${APP}`,
  html: renderEmailShell({
    title: "Senha Alterada",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph("Sua senha foi alterada com sucesso."),
      paragraph("Agora você pode acessar sua conta com a nova senha."),
      button("Acessar Plataforma", context.appUrl),
      callout(
        "Se não foi você quem alterou, procure a coordenação imediatamente.",
        EmailCalloutTone.DANGER,
      ),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    "Sua senha foi alterada com sucesso.",
    `Acesse a plataforma: ${context.appUrl}`,
    "",
    "Se não foi você quem alterou, procure a coordenação imediatamente.",
  ].join("\n"),
});

export const renderEmailVerification = (
  data: EmailVerificationEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Confirme seu e-mail - ${APP}`,
  html: renderEmailShell({
    title: "Confirme seu e-mail",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph("Seu cadastro foi recebido! Falta só confirmar o e-mail."),
      button("Confirmar e-mail", data.verificationLink),
      fallbackLink(data.verificationLink),
      callout(
        `O link vale por <strong>${data.ttlHours} horas</strong>. Depois de confirmar, a coordenação libera seu acesso.`,
        EmailCalloutTone.INFO,
      ),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    "Seu cadastro foi recebido! Falta só confirmar o e-mail.",
    `Acesse: ${data.verificationLink}`,
    "",
    `O link vale por ${data.ttlHours} horas.`,
    "Depois de confirmar, a coordenação libera seu acesso.",
  ].join("\n"),
});

export const renderAccountApproved = (
  data: AccountApprovedEmailData,
  context: EmailRenderContext,
): RenderedEmail => ({
  subject: `Seu acesso foi liberado - ${APP}`,
  html: renderEmailShell({
    title: "Acesso liberado",
    greetingName: data.userName,
    logoUrl: context.logoUrl,
    body: [
      paragraph("Sua conta foi aprovada pela coordenação."),
      paragraph("Você já pode entrar na plataforma com seu e-mail e senha."),
      button("Entrar", `${context.appUrl}/login`),
    ].join(""),
  }),
  text: [
    `Olá ${data.userName},`,
    "",
    "Sua conta foi aprovada pela coordenação.",
    `Entre em: ${context.appUrl}/login`,
  ].join("\n"),
});
