import type { RazorpayServerConfig } from "@/lib/razorpay-config";

type RazorpayNotes = Record<string, string | number | boolean>;

export type CreateRazorpayOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: RazorpayNotes;
};

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status?: string;
};

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount?: number;
  status?: string;
};

function makeAuthHeader(config: RazorpayServerConfig): string {
  const token = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function parseRazorpayResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      typeof json?.error === "object" &&
      json?.error !== null &&
      "description" in json.error &&
      typeof (json.error as { description?: unknown }).description === "string"
        ? (json.error as { description: string }).description
        : `Razorpay request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (json || {}) as T;
}

export async function createRazorpayOrder(
  config: RazorpayServerConfig,
  input: CreateRazorpayOrderInput
): Promise<RazorpayOrder> {
  const response = await fetch(`${config.baseUrl}/orders`, {
    method: "POST",
    headers: {
      Authorization: makeAuthHeader(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes || {},
    }),
    cache: "no-store",
  });

  const order = await parseRazorpayResponse<RazorpayOrder>(response);

  if (!order.id || typeof order.amount !== "number" || !order.currency) {
    throw new Error("Invalid Razorpay order response");
  }

  return order;
}

export async function fetchRazorpayOrder(
  config: RazorpayServerConfig,
  orderId: string
): Promise<RazorpayOrder> {
  const response = await fetch(`${config.baseUrl}/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: makeAuthHeader(config),
    },
    cache: "no-store",
  });

  const order = await parseRazorpayResponse<RazorpayOrder>(response);

  if (!order.id) {
    throw new Error("Invalid Razorpay order payload");
  }

  return order;
}

export async function fetchRazorpayPayment(
  config: RazorpayServerConfig,
  paymentId: string
): Promise<RazorpayPayment> {
  const response = await fetch(`${config.baseUrl}/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: makeAuthHeader(config),
    },
    cache: "no-store",
  });

  const payment = await parseRazorpayResponse<RazorpayPayment>(response);

  if (!payment.id || !payment.order_id) {
    throw new Error("Invalid Razorpay payment payload");
  }

  return payment;
}