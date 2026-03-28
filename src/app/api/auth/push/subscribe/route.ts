import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const endpointOnlySchema = z.object({
  endpoint: z.string().url(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = subscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parsed.data;

  await prisma.$transaction([
    prisma.staffPushSubscription.deleteMany({ where: { endpoint } }),
    prisma.staffPushSubscription.create({
      data: {
        staffMemberId: auth.access.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = endpointOnlySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  await prisma.staffPushSubscription.deleteMany({
    where: {
      staffMemberId: auth.access.userId,
      endpoint: parsed.data.endpoint,
    },
  });

  return NextResponse.json({ ok: true });
}
