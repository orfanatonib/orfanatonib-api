/**
 * Campo-isca do formulário público: fica escondido para pessoas e é preenchido por robôs.
 * Quando vem preenchido, a mensagem é descartada sem avisar (o robô acredita que enviou).
 */
export const CONTACT_HONEYPOT_FIELD = "website";

export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}
