import "server-only";

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasCycle =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
};

export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  billingType: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  subscription?: string | null;
  externalReference?: string | null;
  customer?: string | null;
  paymentDate?: string | null;
  confirmedDate?: string | null;
};

export type AsaasSubscription = {
  id: string;
  status: string;
  value: number;
  cycle: string;
  billingType: string;
  nextDueDate: string;
  externalReference?: string | null;
  customer: string;
};

export type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

export class AsaasApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AsaasApiError";
    this.status = status;
    this.body = body;
  }
}

function platformBaseUrl(): string {
  const env = process.env.ASAAS_ENV?.trim().toLowerCase();
  if (process.env.ASAAS_API_URL?.trim()) {
    return process.env.ASAAS_API_URL.trim().replace(/\/$/, "");
  }
  if (env === "production" || env === "prod") {
    return "https://api.asaas.com/api/v3";
  }
  return "https://api-sandbox.asaas.com/api/v3";
}

export function getPlatformAsaasApiKey(): string | null {
  return process.env.ASAAS_API_KEY?.trim() || null;
}

export function isPlatformAsaasConfigured(): boolean {
  return Boolean(getPlatformAsaasApiKey() && process.env.ASAAS_WEBHOOK_TOKEN?.trim());
}

export function verifyAsaasWebhookToken(headerValue: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expected || !headerValue) return false;
  return headerValue.trim() === expected;
}

async function asaasFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${platformBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body &&
      "errors" in body &&
      Array.isArray((body as { errors: { description?: string }[] }).errors)
        ? (body as { errors: { description?: string }[] }).errors
            .map((e) => e.description)
            .filter(Boolean)
            .join("; ") || `Asaas HTTP ${res.status}`
        : `Asaas HTTP ${res.status}`;
    throw new AsaasApiError(msg, res.status, body);
  }
  return body as T;
}

export async function asaasCreateCustomer(
  apiKey: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
    cpfCnpj?: string | null;
    externalReference?: string | null;
  },
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(apiKey, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobilePhone: data.mobilePhone || undefined,
      cpfCnpj: data.cpfCnpj?.replace(/\D/g, "") || undefined,
      externalReference: data.externalReference || undefined,
    }),
  });
}

export async function asaasFindCustomerByExternalRef(
  apiKey: string,
  externalReference: string,
): Promise<AsaasCustomer | null> {
  const data = await asaasFetch<{ data?: AsaasCustomer[] }>(
    apiKey,
    `/customers?externalReference=${encodeURIComponent(externalReference)}`,
  );
  return data.data?.[0] ?? null;
}

/** Valida a API key sem mutar dados (lista vazia ok). */
export async function asaasPingApiKey(apiKey: string): Promise<void> {
  await asaasFetch(apiKey, "/customers?limit=1");
}

export async function asaasCreatePayment(
  apiKey: string,
  data: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  },
): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(apiKey, "/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function asaasGetPayment(
  apiKey: string,
  paymentId: string,
): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(apiKey, `/payments/${paymentId}`);
}

export async function asaasGetPixQrCode(
  apiKey: string,
  paymentId: string,
): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(apiKey, `/payments/${paymentId}/pixQrCode`);
}

export async function asaasCreateSubscription(
  apiKey: string,
  data: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    nextDueDate: string;
    cycle: AsaasCycle;
    description?: string;
    externalReference?: string;
  },
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(apiKey, "/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function asaasCancelSubscription(
  apiKey: string,
  subscriptionId: string,
): Promise<void> {
  await asaasFetch(apiKey, `/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

export async function asaasListSubscriptionPayments(
  apiKey: string,
  subscriptionId: string,
): Promise<AsaasPayment[]> {
  const data = await asaasFetch<{ data?: AsaasPayment[] }>(
    apiKey,
    `/subscriptions/${subscriptionId}/payments`,
  );
  return data.data ?? [];
}

export function cycleFromDays(cycleDays: number): AsaasCycle {
  if (cycleDays <= 7) return "WEEKLY";
  if (cycleDays <= 14) return "BIWEEKLY";
  if (cycleDays <= 31) return "MONTHLY";
  if (cycleDays <= 93) return "QUARTERLY";
  if (cycleDays <= 186) return "SEMIANNUALLY";
  return "YEARLY";
}

export function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const ORG_WEBHOOK_EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_DELETED",
] as const;

type AsaasWebhookRow = {
  id: string;
  url?: string | null;
  name?: string | null;
  enabled?: boolean;
};

/**
 * Garante que a conta Asaas do salão notifica a Barbernegon.
 * O dono não precisa configurar webhook manualmente.
 */
export async function asaasEnsureOrgWebhook(
  apiKey: string,
  opts: { url: string; authToken: string; email?: string | null },
): Promise<{ created: boolean; updated: boolean; webhookId: string }> {
  const list = await asaasFetch<{ data?: AsaasWebhookRow[] }>(
    apiKey,
    "/webhooks",
  );
  const existing = (list.data ?? []).find(
    (w) => (w.url ?? "").replace(/\/$/, "") === opts.url.replace(/\/$/, ""),
  );

  const body = {
    name: "Barbernegon",
    url: opts.url,
    email: opts.email?.trim() || undefined,
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken: opts.authToken,
    sendType: "SEQUENTIALLY",
    events: [...ORG_WEBHOOK_EVENTS],
  };

  if (existing?.id) {
    await asaasFetch(apiKey, `/webhooks/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { created: false, updated: true, webhookId: existing.id };
  }

  const created = await asaasFetch<AsaasWebhookRow>(apiKey, "/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!created.id) {
    throw new AsaasApiError("Webhook criado sem id.", 500, created);
  }
  return { created: true, updated: false, webhookId: created.id };
}
