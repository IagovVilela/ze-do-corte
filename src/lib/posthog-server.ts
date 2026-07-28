import { PostHog } from "posthog-node";

const token =
  process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function getPostHogClient(): PostHog {
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_KEY (or alias NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) required by PostHog is missing or un-configured, " +
          "this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
      );
    }
  }
  return new PostHog(token ?? "", {
    host: host ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}
