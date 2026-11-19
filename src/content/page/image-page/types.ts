/** Dados agregados de uma publicação do feed, calculados para quem pergunta. */
export interface FeedSectionExtras {
  showAuthor: boolean;
  celebrationCount: number;
  celebratedByMe: boolean;
  commentCount: number;
}

export const EMPTY_FEED_EXTRAS: FeedSectionExtras = {
  showAuthor: false,
  celebrationCount: 0,
  celebratedByMe: false,
  commentCount: 0,
};
