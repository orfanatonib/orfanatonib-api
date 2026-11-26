import { IsOptional, IsString } from "class-validator";

/**
 * O `credential` que o botão do Google devolve ao frontend.
 *
 * O campo é opcional na validação de propósito: token ausente hoje responde
 * `401 Google authentication failed`, junto com token inválido e expirado, e o
 * frontend trata esses três casos da mesma forma. Exigir aqui trocaria por um
 * `400` e mudaria o contrato sem necessidade.
 */
export class GoogleLoginDto {
  @IsOptional()
  @IsString()
  token?: string;
}
