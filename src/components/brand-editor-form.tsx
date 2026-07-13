"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

export function BrandEditorForm() {
  const [form, setForm] = useState<OrgForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/organization");
        const data = (await res.json()) as {
          organization?: Record<string, string | null>;
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Falha ao carregar.");
        const o = data.organization!;
        setForm({
          name: o.name ?? "",
          slug: o.slug ?? "",
          logoUrl: o.logoUrl ?? "",
          primaryColor: o.primaryColor ?? "#c4a574",
          slogan: o.slogan ?? "",
          sloganSecondary: o.sloganSecondary ?? "",
          heroMediaUrl: o.heroMediaUrl ?? "",
          aboutText: o.aboutText ?? "",
          instagramHref: o.instagramHref ?? "",
          whatsappHref: o.whatsappHref ?? "",
          phoneLabel: o.phoneLabel ?? "",
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
          logoUrl: form.logoUrl || null,
          heroMediaUrl: form.heroMediaUrl || null,
          instagramHref: form.instagramHref || null,
          whatsappHref: form.whatsappHref || null,
          phoneLabel: form.phoneLabel || null,
          slogan: form.slogan || null,
          sloganSecondary: form.sloganSecondary || null,
          aboutText: form.aboutText || null,
          onboardingJson: { logo: Boolean(form.logoUrl.trim()) },
        }),
      });
      const data = (await res.json()) as { message?: string; organization?: { slug: string } };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      setMessage("Marca atualizada.");
      if (data.organization?.slug) {
        setForm((f) => ({ ...f, slug: data.organization!.slug }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20";

  if (loading) {
    return <p className="text-sm text-zinc-400">Carregando marca…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Site público:{" "}
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
          {saving ? "Salvando…" : "Salvar marca"}
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

      {(
        [
          ["name", "Nome da barbearia"],
          ["slug", "Slug (URL)"],
          ["slogan", "Slogan principal"],
          ["sloganSecondary", "Frase de apoio"],
          ["logoUrl", "URL do logo"],
          ["heroMediaUrl", "URL da mídia do hero (imagem ou vídeo)"],
          ["primaryColor", "Cor principal (#hex)"],
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
            {...(key === "primaryColor" ? { type: "text", pattern: "#[0-9A-Fa-f]{6}" } : {})}
          />
        </label>
      ))}

      <label className="block space-y-1.5 text-sm">
        <span className="text-zinc-300">Texto sobre a casa</span>
        <textarea
          value={form.aboutText}
          onChange={(e) => setForm((f) => ({ ...f, aboutText: e.target.value }))}
          rows={4}
          className={inputClass}
        />
      </label>
    </form>
  );
}
