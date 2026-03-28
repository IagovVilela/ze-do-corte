"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { formatBrPhoneNational } from "@/lib/br-phone-format";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

type Props = {
  email: string;
  displayName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  avatarUploadEnabled: boolean;
};

export function AdminProfileForm({
  email,
  displayName: initialDisplayName,
  phone: initialPhone,
  profileImageUrl: initialUrl,
  avatarUploadEnabled,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [phone, setPhone] = useState(() => formatBrPhoneNational(initialPhone ?? ""));
  const [profileImageUrl, setProfileImageUrl] = useState(initialUrl);

  useEffect(() => {
    setPhone(formatBrPhoneNational(initialPhone ?? ""));
  }, [initialPhone]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const wantsPassword =
      newPassword.length > 0 || currentPassword.length > 0 || confirmPassword.length > 0;
    if (wantsPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(`Nova senha: mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Confirmação da nova senha não confere.");
        return;
      }
      if (!currentPassword) {
        setError("Informe a senha atual para alterar a senha.");
        return;
      }
    }

    const body: Record<string, unknown> = {
      displayName: displayName.trim() || null,
      phone: formatBrPhoneNational(phone) || null,
    };
    if (wantsPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        sessionEnded?: boolean;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível salvar.");
        return;
      }
      if (data.sessionEnded) {
        window.location.href = "/admin/login";
        return;
      }
      setMessage("Dados salvos.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(f: FileList | null) {
    const file = f?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/auth/profile/avatar", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        profileImageUrl?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Falha no envio da foto.");
        return;
      }
      if (data.profileImageUrl) {
        setProfileImageUrl(data.profileImageUrl);
      }
      setMessage("Foto atualizada.");
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setError(null);
    setMessage(null);
    setRemoving(true);
    try {
      const res = await fetch("/api/auth/profile/avatar", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível remover a foto.");
        return;
      }
      setProfileImageUrl(null);
      setMessage("Foto removida.");
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold text-zinc-200">Foto de perfil</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Aparece na barra do painel. Formatos: JPEG, PNG ou WebP (até 4 MB).
        </p>

        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={false}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-medium text-zinc-500">
                {(displayName || email).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files)}
            />
            <button
              type="button"
              disabled={!avatarUploadEnabled || uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-brand-500/20 px-4 py-2 text-sm font-medium text-brand-100 ring-1 ring-brand-500/40 transition hover:bg-brand-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? "Enviando…" : "Alterar foto"}
            </button>
            {profileImageUrl ? (
              <button
                type="button"
                disabled={!avatarUploadEnabled || removing}
                onClick={() => void removeAvatar()}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:border-rose-500/40 hover:text-rose-200 disabled:opacity-40"
              >
                {removing ? "Removendo…" : "Remover foto"}
              </button>
            ) : null}
          </div>
        </div>

        {!avatarUploadEnabled ? (
          <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            O servidor ainda não tem as variáveis Cloudinary (
            <code className="text-amber-50/90">CLOUDINARY_*</code>). Configure-as para
            habilitar fotos.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => void saveProfile(e)}
        className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6"
      >
        <h2 className="text-sm font-semibold text-zinc-200">Seus dados</h2>
        <p className="mt-1 text-xs text-zinc-500">
          O e-mail de login só pode ser alterado por um administrador na Equipe.
        </p>

        <label className="mt-5 block text-xs font-medium text-zinc-400">E-mail</label>
        <input
          type="text"
          readOnly
          value={email}
          className="mt-1 w-full cursor-not-allowed rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-500"
        />

        <label className="mt-4 block text-xs font-medium text-zinc-400">Nome de exibição</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-brand-500/0 transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30"
          placeholder="Como prefere ser chamado"
        />

        <label className="mt-4 block text-xs font-medium text-zinc-400">Telefone</label>
        <p className="mt-0.5 text-xs text-zinc-600">Formato brasileiro: (DDD) número</p>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatBrPhoneNational(e.target.value))}
          maxLength={15}
          className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm tabular-nums tracking-wide text-zinc-100 outline-none ring-brand-500/0 transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30"
          placeholder="(00) 00000-0000"
        />

        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold text-zinc-200">Alterar senha</h3>
          <p className="mt-1 text-xs text-zinc-500">Deixe em branco para manter a senha atual.</p>

          <label className="mt-4 block text-xs font-medium text-zinc-400">Senha atual</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30"
          />

          <label className="mt-4 block text-xs font-medium text-zinc-400">Nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30"
          />

          <label className="mt-4 block text-xs font-medium text-zinc-400">Confirmar nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {error ? (
          <p className="mt-4 text-sm text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-emerald-300" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
