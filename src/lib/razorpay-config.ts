export type RazorpayServerConfig = {
  keyId: string;
  publicKeyId: string;
  keySecret: string;
  baseUrl: string;
  missing: string[];
};

function resolveFirst(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = (value || "").trim();
    if (normalized) return normalized;
  }

  return "";
}

export function getRazorpayServerConfig(): RazorpayServerConfig {
  const keyId = resolveFirst(
    process.env.RAZORPAY_KEY_ID,
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  );

  const keySecret = resolveFirst(process.env.RAZORPAY_KEY_SECRET);

  const baseUrl = resolveFirst(process.env.RAZORPAY_BASE_URL, "https://api.razorpay.com/v1");

  const missing: string[] = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");

  return {
    keyId,
    publicKeyId: keyId,
    keySecret,
    baseUrl,
    missing,
  };
}