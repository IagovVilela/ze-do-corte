"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  ColorWheelField,
  normalizeHexColor,
} from "@/components/color-wheel-field";
import { formatBrPhoneNational } from "@/lib/br-input-masks";
import { publicSurfaceUrl } from "@/lib/public-hosts";

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
  marketplaceListed: boolean;
};

const empty: OrgForm = {
  name: "",
  slug: "",
  logoUrl: "",
  primaryColor: "#3b82f6",
  slogan: "",
  sloganSecondary: "",
  heroMediaUrl: "",
  aboutText: "",
  instagramHref: "",
  whatsappHref: "",
  phoneLabel: "",
  marketplaceListed: true,
};

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return normalizeHexColor(v, "#3b82f6");
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
          primaryColor: normalizeHex(String(o.primaryColor ?? "#3b82f6")),
          slogan: String(o.slogan ?? ""),
          sloganSecondary: String(o.sloganSecondary ?? ""),
          heroMediaUrl: String(o.heroMediaUrl ?? ""),
          aboutText: String(o.aboutText ?? ""),
          instagramHref: String(o.instagramHref ?? ""),
          whatsappHref: String(o.whatsappHref ?? ""),
          phoneLabel: formatBrPhoneNational(String(o.phoneLabel ?? "")),
          marketplaceListed: o.marketplaceListed !== false,
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
          marketplaceListed: form.marketplaceListed,
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
    "w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-4 py-2.5 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20";

  const colorValue = normalizeHex(form.primaryColor);

  if (loading) {
    return <p className="text-sm text-[var(--bn-muted)]">Carregando marca…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--bn-muted)]">
          Layout da página:{" "}
          <Link
            href="/admin/site"
            className="text-[var(--bn-primary)] underline-offset-2 hover:underline"
          >
            abrir canvas
          </Link>
          {" · "}
          Público:{" "}
          <Link
            href={`/${form.slug}`}
            className="text-[var(--bn-primary)] underline-offset-2 hover:underline"
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
              ? "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-[var(--bn-status-danger)]"
              : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-[var(--bn-status-ok)]"
          }
        >
          {error || message}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={form.marketplaceListed}
            onChange={(e) =>
              setForm((f) => ({ ...f, marketplaceListed: e.target.checked }))
            }
            className="mt-1 size-4 rounded border-[var(--bn-border)]"
          />
          <span>
            <span className="block font-medium text-[var(--bn-on)]">
              Aparecer na busca Barbernegon
            </span>
            <span className="mt-0.5 block text-[12px] text-[var(--bn-muted)]">
              Clientes encontram seu salão em{" "}
              <Link
                href={publicSurfaceUrl("marketplace", "/explorar")}
                className="text-[var(--bn-primary)] hover:underline"
              >
                {publicSurfaceUrl("marketplace", "/explorar")}
              </Link>{" "}
              e entram no seu site (/{form.slug || "…"}).
            </span>
          </span>
        </label>

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
            <span className="text-[var(--bn-on-variant)]">{label}</span>
            <input
              value={form[key]}
              type={key === "phoneLabel" ? "tel" : "text"}
              inputMode={key === "phoneLabel" ? "tel" : undefined}
              placeholder={
                key === "phoneLabel" ? "(11) 99999-0000" : undefined
              }
              onChange={(e) => {
                const raw = e.target.value;
                setForm((f) => ({
                  ...f,
                  [key]:
                    key === "phoneLabel" ? formatBrPhoneNational(raw) : raw,
                }));
              }}
              className={inputClass}
            />
          </label>
        ))}

        <div className="space-y-1.5 text-sm">
          <span className="text-[var(--bn-on-variant)]">Cor principal</span>
          <div className="flex items-center gap-3">
            <ColorWheelField
              aria-label="Escolher cor principal"
              value={colorValue}
              onChange={(hex) =>
                setForm((f) => ({ ...f, primaryColor: hex }))
              }
              className="h-11 w-14 rounded-lg border border-[var(--bn-border)] bg-transparent p-1"
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
              placeholder="#3b82f6"
              spellCheck={false}
            />
            <span
              className="h-11 flex-1 rounded-xl border border-[var(--bn-border)]"
              style={{ backgroundColor: colorValue }}
              aria-hidden
            />
          </div>
          <p className="text-[11px] text-[var(--bn-muted)]">
            Toque no quadrado e arraste a bolinha até a cor desejada.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssetUploadField
            title="Logo"
            hint="JPEG, PNG ou WebP até 20 MB."
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
            hint="Imagem até 20 MB (JPEG/PNG/WebP) ou vídeo até 40 MB (MP4/WebM)."
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
          <span className="text-[var(--bn-on-variant)]">Texto sobre a casa</span>
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
    "mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60";
  const showVideo = allowVideo && url && isVideoUrl(url);

  return (
    <div className="space-y-2 text-sm">
      <span className="text-[var(--bn-on-variant)]">{title}</span>
      {url ? (
        showVideo ? (
          <video
            src={url}
            className="max-h-36 w-full rounded-xl border border-[var(--bn-border)] object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-36 w-full rounded-xl border border-[var(--bn-border)] object-contain bg-[var(--bn-surface-low)]/60"
          />
        )
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[var(--bn-border)] text-[11px] text-[var(--bn-muted)]">
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
          className="w-full rounded-xl border border-[var(--bn-border)] px-3 py-1.5 text-[11px] text-[var(--bn-muted)] hover:border-[var(--bn-border)] hover:text-[var(--bn-on-variant)] disabled:opacity-50"
        >
          Remover
        </button>
      ) : null}

      <p className="text-[10px] leading-relaxed text-[var(--bn-muted)]">{hint}</p>

      <details className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-low)] px-2 py-1.5">
        <summary className="cursor-pointer text-[11px] text-[var(--bn-muted)] hover:text-[var(--bn-on-variant)]">
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
