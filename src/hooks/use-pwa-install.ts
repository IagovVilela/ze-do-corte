"use client";

import { useCallback, useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let capturedPrompt: BeforeInstallPromptEvent | null = null;
let globalBound = false;

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

function isMobileClient(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return coarse || narrow;
}

function bindGlobalPromptCapture() {
  if (typeof window === "undefined" || globalBound) return;
  globalBound = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("bn-pwa-prompt"));
  });
  window.addEventListener("appinstalled", () => {
    capturedPrompt = null;
  });
}

bindGlobalPromptCapture();

export function capturePwaInstallPrompt() {
  bindGlobalPromptCapture();
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bindGlobalPromptCapture();
    if (isStandaloneDisplay()) {
      setInstalled(true);
      setReady(true);
      return;
    }

    setIosEligible(isIosSafari());
    setMobile(isMobileClient());
    if (capturedPrompt) setDeferred(capturedPrompt);
    setReady(true);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* ignore */
        });
    }

    const onPrompt = () => {
      if (capturedPrompt) setDeferred(capturedPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("bn-pwa-prompt", onPrompt);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bn-pwa-prompt", onPrompt);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      capturedPrompt = null;
      setDeferred(null);
      return true;
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  const canOffer = ready && !installed && (Boolean(deferred) || iosEligible || mobile);

  return {
    ready,
    installed,
    busy,
    deferred,
    iosEligible,
    mobile,
    canOffer,
    install,
  };
}
