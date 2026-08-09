export type WhatsAppDraftKind =
  | "winback"
  | "club_underuse"
  | "club_past_due"
  | "club_churn"
  | "club_near_limit";

export type WhatsAppDraftFacts = {
  kind: WhatsAppDraftKind;
  /** Primeiro nome apenas — sem telefone/CPF. */
  firstName: string;
  daysSinceLastActivity?: number | null;
  planName?: string | null;
  lastServiceHint?: string | null;
  shopName?: string | null;
};

export type WhatsAppDraftResult = {
  message: string;
  variants: string[];
  source: "llm" | "rules";
};
