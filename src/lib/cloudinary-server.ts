import "server-only";

import { v2 as cloudinary } from "cloudinary";

function ensureConfigured(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary não configurado: defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.",
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

const PROFILE_FOLDER = "ze-do-corte/profiles";
const BRAND_FOLDER = "barbernegon/org-brand";

export async function uploadProfileImageBuffer(
  buffer: Buffer,
  mimeType: string,
  staffMemberId: string,
): Promise<{ secureUrl: string; publicId: string }> {
  ensureConfigured();
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: PROFILE_FOLDER,
    public_id: `user_${staffMemberId}_${Date.now()}`,
    overwrite: false,
    use_filename: false,
    unique_filename: false,
    transformation: [
      { width: 512, height: 512, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
    resource_type: "image",
  });
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

/** Logo, hero ou mídia solta do canvas do site (imagem ou vídeo). */
export async function uploadBrandAssetBuffer(
  buffer: Buffer,
  mimeType: string,
  organizationId: string,
  kind: "logo" | "hero" | "canvas",
): Promise<{ secureUrl: string; publicId: string }> {
  ensureConfigured();
  const isVideo = mimeType.startsWith("video/");
  const resourceType = isVideo ? ("video" as const) : ("image" as const);
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  if (isVideo) {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `${BRAND_FOLDER}/${organizationId}`,
      public_id: `${kind}_${Date.now()}`,
      overwrite: false,
      resource_type: resourceType,
    });
    return { secureUrl: result.secure_url, publicId: result.public_id };
  }

  const transformation =
    kind === "logo"
      ? [
          { width: 512, height: 512, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ]
      : kind === "hero"
        ? [
            { width: 1920, height: 1080, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ]
        : [
            { width: 2400, height: 2400, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ];
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${BRAND_FOLDER}/${organizationId}`,
    public_id: `${kind}_${Date.now()}`,
    overwrite: false,
    transformation,
    resource_type: "image",
  });
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

export async function destroyCloudinaryImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId) return;
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
