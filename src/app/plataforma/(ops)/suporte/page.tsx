import { SupportPlatformPanel } from "@/components/plataforma/support-platform-panel";

export const dynamic = "force-dynamic";

export default function PlataformaSuportePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.1em] text-brand-300 uppercase">
          Ops
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Suporte
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Inbox de chamados abertos pelos salões.
        </p>
      </div>
      <SupportPlatformPanel />
    </div>
  );
}
