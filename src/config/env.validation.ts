import {
  ALLOWED_ENVIRONMENTS,
  CORS_ALLOWED_ORIGINS_VARIABLE,
  DEPLOYED_ENVIRONMENTS,
  PORT_VARIABLES,
  REQUIRED_ALWAYS,
  REQUIRED_WHEN_DEPLOYED,
} from "./env.constants";
import { parseAllowedOrigins } from "./cors.config";

export type EnvironmentVariables = Record<string, unknown>;

/** Converte para texto só o que é escalar; objetos viram vazio (variável de ambiente é sempre texto). */
const asText = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const isBlank = (value: unknown): boolean => asText(value).trim() === "";

/** Resolve o nome do ambiente do mesmo jeito que `AppModule` escolhe o arquivo `.env`. */
export function resolveEnvironmentName(config: EnvironmentVariables): string {
  return asText(config.ENVIRONMENT) || asText(config.NODE_ENV) || "local";
}

/**
 * Valida o ambiente no boot. Só nomes de variáveis entram nas mensagens:
 * valores (segredos) nunca são ecoados.
 */
export function validateEnv(
  config: EnvironmentVariables,
): EnvironmentVariables {
  const errors: string[] = [];
  const environment = resolveEnvironmentName(config);

  if (
    !isBlank(config.ENVIRONMENT) &&
    !(ALLOWED_ENVIRONMENTS as readonly string[]).includes(
      asText(config.ENVIRONMENT),
    )
  ) {
    errors.push(
      `ENVIRONMENT deve ser um de: ${ALLOWED_ENVIRONMENTS.join(", ")}`,
    );
  }

  const missing = [
    ...REQUIRED_ALWAYS,
    ...(DEPLOYED_ENVIRONMENTS.includes(environment)
      ? REQUIRED_WHEN_DEPLOYED
      : []),
  ].filter((name) => isBlank(config[name]));
  if (missing.length > 0) {
    errors.push(`variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  }

  for (const name of PORT_VARIABLES) {
    if (isBlank(config[name])) continue;
    const port = Number(asText(config[name]));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push(`${name} deve ser um inteiro entre 1 e 65535`);
    }
  }

  if (!isBlank(config[CORS_ALLOWED_ORIGINS_VARIABLE])) {
    const { invalid } = parseAllowedOrigins(
      asText(config[CORS_ALLOWED_ORIGINS_VARIABLE]),
    );
    if (invalid.length > 0) {
      errors.push(
        `${CORS_ALLOWED_ORIGINS_VARIABLE} tem ${invalid.length} origem(ns) inválida(s): use URLs absolutas http(s) separadas por vírgula`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuração inválida: ${errors.join("; ")}`);
  }
  return config;
}
