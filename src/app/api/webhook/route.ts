export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { error: "Webhook endpoint is not configured" },
    { status: 501 }
  );
}
