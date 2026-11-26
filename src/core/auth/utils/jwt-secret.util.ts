import type { ConfigService } from "@nestjs/config";

/**
 * Único ponto de leitura de `JWT_SECRET` (módulo, estratégia e verificação).
 * `getOrThrow`: a variável é obrigatória no boot (`validateEnv`); se ainda assim
 * faltar, o erro é de CONFIGURAÇÃO (derruba/500), nunca um 401 que esconda a falha.
 */
export const readJwtSecret = (
  config: Pick<ConfigService, "getOrThrow">,
): string => config.getOrThrow<string>("JWT_SECRET");
