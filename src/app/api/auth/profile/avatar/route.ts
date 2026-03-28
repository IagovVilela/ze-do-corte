import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  destroyCloudinaryImage,
  isCloudinaryConfigured,
  uploadProfileImageBuffer,
} from "@/lib/cloudinary-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { message: "Armazenamento de imagens não configurado (Cloudinary)." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Formulário inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "Envie um arquivo no campo file." }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { message: "Use JPEG, PNG ou WebP." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ message: "Imagem até 4 MB." }, { status: 400 });
  }

  const existing = await prisma.staffMember.findUnique({
    where: { id: auth.access.userId },
    select: { profileImagePublicId: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  let newPublicId: string | null = null;
  try {
    const { secureUrl, publicId } = await uploadProfileImageBuffer(
      buf,
      mime,
      auth.access.userId,
    );
    newPublicId = publicId;

    await prisma.staffMember.update({
      where: { id: auth.access.userId },
      data: {
        profileImageUrl: secureUrl,
        profileImagePublicId: publicId,
      },
      select: {
        profileImageUrl: true,
        profileImagePublicId: true,
      },
    });

    if (existing.profileImagePublicId) {
      await destroyCloudinaryImage(existing.profileImagePublicId);
    }

    return NextResponse.json({
      profileImageUrl: secureUrl,
    });
  } catch (err) {
    if (newPublicId) {
      await destroyCloudinaryImage(newPublicId);
    }
    console.error("[avatar upload]", err);
    return NextResponse.json(
      { message: "Falha ao enviar a imagem. Tente de novo." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { message: "Armazenamento de imagens não configurado (Cloudinary)." },
      { status: 503 },
    );
  }

  const existing = await prisma.staffMember.findUnique({
    where: { id: auth.access.userId },
    select: { profileImagePublicId: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  if (existing.profileImagePublicId) {
    await destroyCloudinaryImage(existing.profileImagePublicId);
  }

  await prisma.staffMember.update({
    where: { id: auth.access.userId },
    data: { profileImageUrl: null, profileImagePublicId: null },
  });

  return NextResponse.json({ ok: true });
}
