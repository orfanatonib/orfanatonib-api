export const VIDEO_PAGE_ROUTE_PREFIX = "galeria_videos_";
export const VIDEO_PAGE_ROUTE_SUBTITLE = "Página de galeria de vídeos";
export const VIDEO_PAGE_ROUTE_IMAGE =
  "https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_videos.png";

export const VideoPageMessages = {
  CREATE_FAILED: "Error creating videos page.",
  UPDATE_FAILED: "Error updating videos page.",
  DELETE_FAILED: "Error removing videos page.",
  PAGE_NOT_FOUND: "Page not found",
  URL_REQUIRED: "URL is required for link type videos.",
} as const;
