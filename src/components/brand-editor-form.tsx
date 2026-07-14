"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type OrgForm = {
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  slogan: string;
  sloganSecondary: string;
  heroMediaUrl: string;
  aboutText: string;
  instagramHref: string;
  whatsappHref: string;
  phoneLabel: string;
};

const empty: OrgForm = {
  name: "",
  slug: "",
  logoUrl: "",
  primaryColor: "#c4a574",
  slogan: "",
  sloganSecondary: "",
  heroMediaUrl: "",
  aboutText: "",
  instagramHref: "",
  whatsappHref: "",
  phoneLabel: "",
};

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return "#c4a574";
}

function isVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/video/upload/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)
  );
}

/** Identidade da marca — layout visual fica em /admin/site (canvas). */
export function BrandEditorForm() {
  const [form, setForm] = useState<OrgForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/organization");
        const data = (await res.json()) as {
          organization?: Record<string, unknown>;
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Falha ao carregar.");
        const o = data.organization!;
        setForm({
          name: String(o.name ?? ""),
          slug: String(o.slug ?? ""),
          logoUrl: String(o.logoUrl ?? ""),
          primaryColor: normalizeHex(String(o.primaryColor ?? "#c4a574")),
          slogan: String(o.slogan ?? ""),
          sloganSecondary: String(o.sloganSecondary ?? ""),
          heroMediaUrl: String(o.heroMediaUrl ?? ""),
          aboutText: String(o.aboutText ?? ""),
          instagramHref: String(o.instagramHref ?? ""),
          whatsappHref: String(o.whatsappHref ?? ""),
          phoneLabel: String(o.phoneLabel ?? ""),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          primaryColor: normalizeHex(form.primaryColor),
          logoUrl: form.logoUrl || null,
          heroMediaUrl: form.heroMediaUrl || null,
          instagramHref: form.instagramHref || null,
          whatsappHref: form.whatsappHref || null,
          phoneLabel: form.phoneLabel || null,
          slogan: form.slogan || null,
          sloganSecondary: form.sloganSecondary || null,
          aboutText: form.aboutText || null,
          onboardingJson: {
            logo: Boolean(form.logoUrl.trim()),
            branding: true,
          },
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        organization?: { slug: string };
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      if (data.organization?.slug) {
        setForm((f) => ({ ...f, slug: data.organization!.slug }));
      }
      setMessage("Identidade atualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAsset(kind: "logo" | "hero", file: File) {
    setUploading(kind);
    setError("");
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const res = await fetch("/api/admin/organization/brand-asset", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        message?: string;
        url?: string;
        organization?: { logoUrl?: string | null; heroMediaUrl?: string | null };
      };
      if (!res.ok) throw new Error(data.message ?? "Falha no upload.");
      if (kind === "logo") {
        setForm((f) => ({
          ...f,
          logoUrl: data.organization?.logoUrl ?? data.url ?? f.logoUrl,
        }));
      } else {
        setForm((f) => ({
          ...f,
          heroMediaUrl:
            data.organization?.heroMediaUrl ?? data.url ?? f.heroMediaUrl,
        }));
      }
      setMessage(kind === "logo" ? "Logo enviado." : "Mídia enviada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setUploading(null);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20";

  const colorValue = normalizeHex(form.primaryColor);

  if (loading) {
    return <p className="text-sm text-zinc-400">Carregando marca…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Layout da página:{" "}
          <Link
            href="/admin/site"
            className="text-brand-200 underline-offset-2 hover:underline"
          >
            abrir canvas
          </Link>
          {" · "}
          Público:{" "}
          <Link
            href={`/${form.slug}`}
            className="text-brand-200 underline-offset-2 hover:underline"
            target="_blank"
          >
            /{form.slug}
          </Link>
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-400 px-5 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar identidade"}
        </button>
      </div>

      {(message || error) && (
        <p
          className={
            error
              ? "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          }
        >
          {error || message}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        {(
          [
            ["name", "Nome da barbearia"],
            ["slug", "Slug (URL)"],
            ["slogan", "Slogan principal"],
            ["sloganSecondary", "Frase de apoio"],
            ["whatsappHref", "Link WhatsApp"],
            ["instagramHref", "Link Instagram"],
            ["phoneLabel", "Telefone (rótulo)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1.5 text-sm">
            <span className="text-zinc-300">{label}</span>
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className={inputClass}
            />
          </label>
        ))}

        <div className="space-y-1.5 text-sm">
          <span className="text-zinc-300">Cor principal</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
              aria-label="Escolher cor principal"
            />
            <input
              value={form.primaryColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  primaryColor: normalizeHex(f.primaryColor),
                }))
              }
              className={`${inputClass} max-w-[9rem] font-mono uppercase`}
              placeholder="#c4a574"
              spellCheck={false}
            />
            <span
              className="h-11 flex-1 rounded-xl border border-white/10"
              style={{ backgroundColor: colorValue }}
              aria-hidden
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Clique no quadrado de cor para abrir o seletor.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssetUploadField
            title="Logo"
            hint="JPEG, PNG ou WebP até 6 MB."
            url={form.logoUrl}
            busy={uploading === "logo"}
            disabled={uploading !== null}
            accept="image/jpeg,image/png,image/webp"
            inputRef={logoInputRef}
            onPick={(file) => void uploadAsset("logo", file)}
            onClear={() => setForm((f) => ({ ...f, logoUrl: "" }))}
            onUrlChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
          />
          <AssetUploadField
            title="Mídia padrão"
            hint="Imagem (JPEG/PNG/WebP) ou vídeo (MP4/WebM)."
            url={form.heroMediaUrl}
            busy={uploading === "hero"}
            disabled={uploading !== null}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            inputRef={heroInputRef}
            allowVideo
            onPick={(file) => void uploadAsset("hero", file)}
            onClear={() => setForm((f) => ({ ...f, heroMediaUrl: "" }))}
            onUrlChange={(url) =>
              setForm((f) => ({ ...f, heroMediaUrl: url }))
            }
          />
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-300">Texto sobre a casa</span>
          <textarea
            value={form.aboutText}
            onChange={(e) =>
              setForm((f) => ({ ...f, aboutText: e.target.value }))
            }
            rows={4}
            className={inputClass}
          />
        </label>
      </section>
    </form>
  );
}

function AssetUploadField({
  title,
  hint,
  url,
  busy,
  disabled,
  accept,
  inputRef,
  allowVideo,
  onPick,
  onClear,
  onUrlChange,
}: {
  title: string;
  hint: string;
  url: string;
  busy: boolean;
  disabled: boolean;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  allowVideo?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onUrlChange: (url: string) => void;
}) {
  const inputClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";
  const showVideo = allowVideo && url && isVideoUrl(url);

  return (
    <div className="space-y-2 text-sm">
      <span className="text-zinc-300">{title}</span>
      {url ? (
        showVideo ? (
          <video
            src={url}
            className="max-h-36 w-full rounded-xl border border-white/10 object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-36 w-full rounded-xl border border-white/10 object-contain bg-zinc-900/60"
          />
        )
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/15 text-[11px] text-zinc-500">
          Nenhum arquivo
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-400 disabled:opacity-50"
      >
        {busy
          ? "Enviando…"
          : url
            ? "Trocar arquivo"
            : "Carregar do dispositivo"}
      </button>

      {url ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-white/30 hover:text-zinc-200 disabled:opacity-50"
        >
          Remover
        </button>
      ) : null}

      <p className="text-[10px] leading-relaxed text-zinc-500">{hint}</p>

      <details className="rounded-xl border border-white/10 bg-zinc-900/40 px-2 py-1.5">
        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
          Ou usar link externo
        </summary>
        <input
          className={inputClass}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://…"
        />
      </details>
    </div>
  );
}
