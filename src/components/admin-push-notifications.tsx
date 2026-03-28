"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushConfigResponse = {
  enabled: boolean;
  publicKey: string | null;
};

export function AdminPushNotifications() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [config, setConfig] = useState<PushConfigResponse | null>(null);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshLocalSubscription = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setSubscribedHere(false);
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setSubscribedHere(Boolean(sub));
  }, []);

  useEffect(() => {
    const swOk = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(swOk);
    if (!swOk) return;

    void (async () => {
      try {
        const res = await fetch("/api/auth/push/config");
        const data = (await res.json()) as PushConfigResponse;
        setConfig(data);
      } catch {
        setConfig({ enabled: false, publicKey: null });
      }
      await refreshLocalSubscription();
    })();
  }, [refreshLocalSubscription]);

  async function subscribe() {
    setError(null);
    setMessage(null);
    if (!config?.enabled || !config.publicKey) {
      setError("Push não está configurado no servidor.");
      return;
    }

    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await reg.update();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permissão de notificação negada.");
        return;
      }

      const key = urlBase64ToUint8Array(config.publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as unknown as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError("Subscrição inválida no navegador.");
        return;
      }

      const res = await fetch("/api/auth/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setMessage(null);
        setError(
          typeof errBody.message === "string" ? errBody.message : "Não foi possível guardar a subscrição.",
        );
        return;
      }
      setMessage("Notificações ativadas neste dispositivo. Novos agendamentos serão avisados por push (sem e-mail).");
      setSubscribedHere(true);
    } catch (e) {
      console.error(e);
      setError("Falha ao ativar notificações.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await fetch("/api/auth/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        await sub.unsubscribe();
      }
      setMessage("Notificações desativadas neste dispositivo. Voltará a receber e-mail se estiver configurado.");
      setSubscribedHere(false);
    } catch (e) {
      console.error(e);
      setError("Falha ao desativar.");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold text-zinc-200">Notificações no navegador</h2>
        <p className="mt-2 text-xs text-zinc-500">
          Este navegador não suporta notificações push. Use um browser recente ou ative apenas o e-mail
          (Resend).
        </p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <p className="text-xs text-zinc-500">A carregar…</p>
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold text-zinc-200">Notificações no navegador</h2>
        <p className="mt-2 text-xs text-zinc-500">
          O servidor ainda não tem VAPID configurado (
          <code className="text-zinc-400">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>,{" "}
          <code className="text-zinc-400">VAPID_PRIVATE_KEY</code>
          , opcionalmente <code className="text-zinc-400">VAPID_SUBJECT</code>). Enquanto isso, avisos de
          novo agendamento seguem só por e-mail (Resend), se configurado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-200">Notificações no navegador</h2>
      <p className="mt-2 text-xs text-zinc-500">
        Com push ativo neste dispositivo, <strong className="text-zinc-400">não enviamos e-mail</strong>{" "}
        para avisar de agendamentos atribuídos a si — só a notificação do browser. Sem push, mantém-se o
        e-mail (Resend), como antes.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {subscribedHere ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void unsubscribe()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-rose-500/40 hover:text-rose-200 disabled:opacity-50"
          >
            {busy ? "A processar…" : "Desativar neste dispositivo"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void subscribe()}
            className="rounded-full bg-brand-500/20 px-4 py-2 text-sm font-medium text-brand-100 ring-1 ring-brand-500/40 transition hover:bg-brand-500/30 disabled:opacity-50"
          >
            {busy ? "A ativar…" : "Ativar notificações neste dispositivo"}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-emerald-300/90" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
