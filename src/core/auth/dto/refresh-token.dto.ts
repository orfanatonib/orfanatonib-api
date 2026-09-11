import { IsOptional, IsString } from "class-validator";

/**
 * Opcional na validação de propósito: refresh ausente responde
 * `401 Refresh token is required`, que é o que o interceptor do frontend
 * espera para disparar o logout. Um `400` daqui quebraria esse fluxo.
 */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
