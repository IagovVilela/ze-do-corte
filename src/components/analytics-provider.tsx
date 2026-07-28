"use client";

/**
 * PostHog is initialized in instrumentation-client.ts (Next.js 15.3+ approach).
 * This component exists solely to satisfy the layout tree.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return children;
}
