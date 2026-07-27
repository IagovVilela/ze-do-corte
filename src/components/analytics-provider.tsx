"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

let booted = false;

function bootPosthog() {
  if (booted || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
  });
  booted = true;
}

/**
 * Analytics opcional (PostHog). Sem `NEXT_PUBLIC_POSTHOG_KEY` não faz nada.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    bootPosthog();
  }, []);

  useEffect(() => {
    if (!KEY || !booted) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return children;
}

/** Dispara evento de produto (no-op se PostHog desligado). */
export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
) {
  if (!KEY || typeof window === "undefined") return;
  bootPosthog();
  posthog.capture(event, properties);
}
