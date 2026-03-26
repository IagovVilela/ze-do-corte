export const LORDICON_SLOTS = [
  "schedule",
  "arrow",
  "phone",
  "chat",
  "social",
] as const;

export type LordIconSlot = (typeof LORDICON_SLOTS)[number];
