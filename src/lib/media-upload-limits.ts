/**
 * Limites de upload de mídia (perfil, marca, canvas).
 * Manter alinhado a `next.config.ts` → `proxyClientMaxBodySize` / `serverActions.bodySizeLimit`.
 */
export const MEDIA_IMAGE_MAX_BYTES = 30 * 1024 * 1024;
export const MEDIA_VIDEO_MAX_BYTES = 60 * 1024 * 1024;

/** Margem multipart acima do vídeo (proxy / Content-Length). */
export const MEDIA_MULTIPART_HARD_CAP_BYTES = MEDIA_VIDEO_MAX_BYTES + 5 * 1024 * 1024;

export const MEDIA_IMAGE_MAX_MB = MEDIA_IMAGE_MAX_BYTES / (1024 * 1024);
export const MEDIA_VIDEO_MAX_MB = MEDIA_VIDEO_MAX_BYTES / (1024 * 1024);

export const MEDIA_IMAGE_LIMIT_LABEL = `${MEDIA_IMAGE_MAX_MB} MB`;
export const MEDIA_VIDEO_LIMIT_LABEL = `${MEDIA_VIDEO_MAX_MB} MB`;

export const MEDIA_IMAGE_HINT = `JPEG, PNG ou WebP até ${MEDIA_IMAGE_LIMIT_LABEL}`;
export const MEDIA_IMAGE_OR_VIDEO_HINT = `JPEG/PNG/WebP até ${MEDIA_IMAGE_LIMIT_LABEL}; MP4/WebM até ${MEDIA_VIDEO_LIMIT_LABEL}`;
