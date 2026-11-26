/** Valores aceitos em `ENVIRONMENT` (o arquivo `env/<nome>.env` é escolhido por ele). */
export const ALLOWED_ENVIRONMENTS = [
  "local",
  "dev",
  "staging",
  "prod",
  "production",
] as const;

/** Ambientes que rodam implantados: exigem configuração explícita. */
export const DEPLOYED_ENVIRONMENTS: readonly string[] = [
  "staging",
  "prod",
  "production",
];

/** Variáveis exigidas em qualquer ambiente (todas já são lidas com `getOrThrow`). */
export const REQUIRED_ALWAYS = [
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_SECRET",
] as const;

/** Variáveis exigidas só em ambiente implantado (sem elas o app cairia em padrões de desenvolvimento). */
export const REQUIRED_WHEN_DEPLOYED = [
  "DB_HOST",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_NAME",
  "AWS_S3_BUCKET_NAME",
] as const;

/** Variáveis que, quando presentes, precisam ser números de porta válidos. */
export const PORT_VARIABLES = ["PORT", "DB_PORT"] as const;

export const CORS_ALLOWED_ORIGINS_VARIABLE = "CORS_ALLOWED_ORIGINS";

/**
 * Modo do provedor de IA: `fake` usa o gateway simulado (E2E e desenvolvimento,
 * sem custo). Nunca pode estar ligado em ambiente de produção.
 */
export const AI_PROVIDER_MODE_VARIABLE = "AI_PROVIDER_MODE";
export const AI_PROVIDER_MODES = ["live", "fake"] as const;
export const PRODUCTION_ENVIRONMENTS: readonly string[] = [
  "prod",
  "production",
];
