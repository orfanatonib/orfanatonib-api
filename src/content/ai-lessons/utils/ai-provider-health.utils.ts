import {
  AiModelCatalogLists,
  AiProviderModelsResponseDto,
} from "../dto/ai-provider-settings-response.dto";
import {
  AiProviderHealthResponseDto,
  AiProviderHealthStatus,
} from "../dto/ai-provider-health-response.dto";

export interface ProviderHealthInput {
  provider: "openai" | "gemini";
  label: string;
  key: { apiKey: string; apiKeyUnreadable?: boolean };
  saved: { generalModel: string; imageModel: string };
  catalog: AiProviderModelsResponseDto;
  checkedAt: Date;
  durationMs: number;
}

/** Modelos salvos que a lista ao vivo não contém (vazio se não há modelo salvo para a capacidade). */
export function missingSavedModels(
  saved: { generalModel: string; imageModel: string },
  live: AiModelCatalogLists,
): string[] {
  const missing: string[] = [];
  if (saved.generalModel && !live.general.includes(saved.generalModel))
    missing.push(saved.generalModel);
  if (saved.imageModel && !live.image.includes(saved.imageModel))
    missing.push(saved.imageModel);
  return missing;
}

/**
 * Resultado do "Testar conexão": a prova é a lista de modelos pedida ao provedor com a chave salva.
 * Lista ao vivo = chave aceita; falha traz o motivo já classificado (recusada, sem permissão, fora do ar).
 */
export function buildProviderHealth(
  input: ProviderHealthInput,
): AiProviderHealthResponseDto {
  const base = {
    provider: input.provider,
    missingModels: [] as string[],
    checkedAt: input.checkedAt.toISOString(),
    durationMs: input.durationMs,
  };
  const fail = (
    status: AiProviderHealthStatus,
    message: string,
  ): AiProviderHealthResponseDto => ({ ...base, status, ok: false, message });

  if (input.key.apiKeyUnreadable)
    return fail(
      AiProviderHealthStatus.UNREADABLE_KEY,
      `A chave de ${input.label} salva não pôde ser lida pelo servidor. Digite a chave novamente e salve.`,
    );
  if (!input.key.apiKey)
    return fail(
      AiProviderHealthStatus.NO_KEY,
      `Nenhuma chave de ${input.label} salva.`,
    );
  if (!input.catalog.isLive)
    return fail(
      AiProviderHealthStatus.FAILED,
      input.catalog.warning ?? `${input.label} não respondeu ao teste.`,
    );

  const missingModels = missingSavedModels(input.saved, input.catalog.models);
  if (missingModels.length)
    return {
      ...base,
      missingModels,
      status: AiProviderHealthStatus.MODEL_MISSING,
      ok: false,
      message: `Conexão com ${input.label} OK, mas o modelo salvo não está disponível: ${missingModels.join(", ")}. Escolha outro modelo.`,
    };
  return {
    ...base,
    status: AiProviderHealthStatus.OK,
    ok: true,
    message: `Conexão com ${input.label} OK. Chave aceita e modelos disponíveis.`,
  };
}
