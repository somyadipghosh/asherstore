export const runtime = "nodejs";

import { z } from "zod";

const schema = z.object({ pincode: z.string().min(6).max(6) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid pincode" }, { status: 400 });
  }

  const prefix = Number(parsed.data.pincode.slice(0, 1));
  const etaDays = prefix <= 3 ? 2 : prefix <= 6 ? 4 : 6;

  return Response.json({
    pincode: parsed.data.pincode,
    etaDays
  });
}
