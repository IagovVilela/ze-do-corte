"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para o navegador oferecer “Instalar app”). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* ignore — ambiente sem SW (ex.: alguns previews) */
    });
  }, []);

  return null;
}
