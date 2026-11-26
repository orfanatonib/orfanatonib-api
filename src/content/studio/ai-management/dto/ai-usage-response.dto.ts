export class AiUsageByModelDto {
  provider!: string;
  model!: string;
  generations!: number;
  inputTokens!: number;
  outputTokens!: number;
  totalTokens!: number;
  averageDurationMs!: number;
}

export class AiUsageResponseDto {
  /** Janela consultada, em dias. */
  days!: number;
  since!: string;
  generations!: number;
  totalTokens!: number;
  byModel!: AiUsageByModelDto[];
}
