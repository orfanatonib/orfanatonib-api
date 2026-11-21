const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Data de nascimento `YYYY-MM-DD` (ou ISO com hora) como `Date` à meia-noite LOCAL.
 * O driver grava colunas `date` pelos componentes locais: `new Date("2001-05-10")` é meia-noite UTC e,
 * num servidor em fuso negativo (ex.: America/Manaus), viraria 2001-05-09 no banco.
 */
export function parseBirthDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
