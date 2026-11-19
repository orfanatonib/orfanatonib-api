export enum AiProviderHealthStatus {
  /** Chave aceita e os modelos escolhidos existem na lista ao vivo do provedor. */
  OK = "OK",
  NO_KEY = "NO_KEY",
  UNREADABLE_KEY = "UNREADABLE_KEY",
  /** Provedor recusou a chave, negou permissão ou está fora do ar (a mensagem diz qual). */
  FAILED = "FAILED",
  /** Chave boa, mas o modelo escolhido não está entre os disponíveis. */
  MODEL_MISSING = "MODEL_MISSING",
}

export class AiProviderHealthResponseDto {
  provider!: "openai" | "gemini";
  status!: AiProviderHealthStatus;
  ok!: boolean;
  message!: string;
  /** Modelos salvos que não apareceram na lista ao vivo (vazio quando OK). */
  missingModels!: string[];
  checkedAt!: string;
  durationMs!: number;
}
