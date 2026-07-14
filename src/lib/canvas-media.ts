/** Detecta URL de vídeo (extensão ou Cloudinary `/video/upload/`). */
export function isCanvasVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes("/video/upload/")) return true;
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);
}

export const CANVAS_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CANVAS_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm";

export const CANVAS_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const CANVAS_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
