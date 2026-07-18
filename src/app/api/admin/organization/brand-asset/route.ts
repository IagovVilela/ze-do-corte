import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  CANVAS_IMAGE_MIME,
  CANVAS_VIDEO_MIME,
} from "@/lib/canvas-media";
import {
  isCloudinaryConfigured,
  uploadBrandAssetBuffer,
} from "@/lib/cloudinary-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Fotos de celular costumam passar de 6 MB; alinhado ao proxyClientMaxBodySize. */
const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageBranding) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        message:
          "Upload indisponível: configure Cloudinary (CLOUDINARY_*).",
      },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const hardCap = VIDEO_MAX_BYTES + 1024 * 1024; // margem multipart
  if (contentLength > hardCap) {
    return NextResponse.json(
      {
        message:
          "Arquivo grande demais. Imagem até 20 MB; vídeo até 40 MB.",
      },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        message:
          "Não foi possível ler o arquivo. Tente de novo com imagem até 20 MB (JPEG/PNG/WebP) ou vídeo até 40 MB (MP4/WebM).",
      },
      { status: 400 },
    );
  }

  const kindRaw = String(form.get("kind") ?? "logo");
  const kind =
    kindRaw === "hero" ? "hero" : kindRaw === "canvas" ? "canvas" : "logo";
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "Envie um arquivo no campo file." }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  const allowVideo = kind === "canvas" || kind === "hero";
  const allowed =
    CANVAS_IMAGE_MIME.has(mime) ||
    (allowVideo && CANVAS_VIDEO_MIME.has(mime));

  if (!allowed) {
    return NextResponse.json(
      {
        message: allowVideo
          ? "Use JPEG, PNG, WebP, MP4 ou WebM."
          : "Use JPEG, PNG ou WebP.",
      },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const maxBytes = CANVAS_VIDEO_MIME.has(mime) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (buf.length > maxBytes) {
    return NextResponse.json(
      {
        message: CANVAS_VIDEO_MIME.has(mime)
          ? "Vídeo até 40 MB."
          : "Imagem até 20 MB.",
      },
      { status: 400 },
    );
  }

  let uploaded: Awaited<ReturnType<typeof uploadBrandAssetBuffer>>;
  try {
    uploaded = await uploadBrandAssetBuffer(
      buf,
      mime,
      auth.access.organizationId,
      kind,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Falha no upload.";
    return NextResponse.json(
      {
        message: detail.includes("File size too large")
          ? "Arquivo acima do limite da Cloudinary. Tente uma versão menor."
          : "Não foi possível enviar a mídia. Tente outro arquivo.",
      },
      { status: 502 },
    );
  }

  // Mídia do canvas: só devolve a URL (não sobrescreve logo/hero da org).
  if (kind === "canvas") {
    return NextResponse.json({
      url: uploaded.secureUrl,
      publicId: uploaded.publicId,
    });
  }

  const data =
    kind === "logo"
      ? { logoUrl: uploaded.secureUrl }
      : { heroMediaUrl: uploaded.secureUrl };

  const current = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { onboardingJson: true },
  });
  const prevOnboarding =
    current?.onboardingJson &&
    typeof current.onboardingJson === "object" &&
    !Array.isArray(current.onboardingJson)
      ? (current.onboardingJson as Record<string, unknown>)
      : {};

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data: {
      ...data,
      ...(kind === "logo"
        ? {
            onboardingJson: {
              ...prevOnboarding,
              logo: true,
              branding: true,
            },
          }
        : {}),
    },
  });

  return NextResponse.json({
    url: uploaded.secureUrl,
    publicId: uploaded.publicId,
    organization: { logoUrl: org.logoUrl, heroMediaUrl: org.heroMediaUrl },
  });
}
