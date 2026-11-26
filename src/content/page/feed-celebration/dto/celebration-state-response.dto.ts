/** Estado de "celebrar" de uma publicação para quem pergunta. Nunca lista nomes. */
export class CelebrationStateResponseDto {
  sectionId: string;
  count: number;
  celebratedByMe: boolean;
}
