import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ConsultantLoginForm } from "@/components/consultores/consultant-login-form";
import {
  extractSupportGateFromSearchParams,
  getConsultantAccessOrNull,
  isValidSupportConsultantGate,
  redirectIfConsultantSession,
  SUPPORT_CONSULTANT_GATE_COOKIE,
} from "@/lib/consultant-auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultoresLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const k = extractSupportGateFromSearchParams(sp);
  const jar = await cookies();
  const cookieGate = jar.get(SUPPORT_CONSULTANT_GATE_COOKIE)?.value ?? null;
  const gate =
    (k && isValidSupportConsultantGate(k) ? k : null) ??
    (isValidSupportConsultantGate(cookieGate) ? cookieGate : null);

  if (!gate) notFound();

  let access = null;
  try {
    access = await getConsultantAccessOrNull();
  } catch {
    /* DB */
  }
  redirectIfConsultantSession(access);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0f1419] px-4 py-16 text-zinc-100">
      <ConsultantLoginForm gate={gate} />
    </div>
  );
}
