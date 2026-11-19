/** Rótulo mostrado quando a autoria não é conhecida ou não pode ser exibida. */
export const UNKNOWN_AUTHOR_LABEL = "Autor não informado";

/**
 * Nome de exibição público: primeiro nome + inicial do último sobrenome
 * ("Maria Souza Lima" → "Maria L."). Nunca devolve e-mail, telefone ou o nome
 * completo. Entrada vazia ou nula → `null`.
 */
export const toPublicDisplayName = (
  fullName: string | null | undefined,
): string | null => {
  const parts = (fullName ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  const first = parts[0];
  if (parts.length === 1) return first;
  const lastInitial = Array.from(parts[parts.length - 1])[0].toUpperCase();
  return `${first} ${lastInitial}.`;
};
