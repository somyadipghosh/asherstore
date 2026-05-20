export const runtime = "nodejs";

import { z } from "zod";

import { predictSize } from "@/lib/size";

const schema = z.object({
  heightCm: z.coerce.number().min(130).max(220),
  weightKg: z.coerce.number().min(35).max(170)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: issue?.message || "Invalid body" },
      { status: 400 }
    );
  }

  const size = predictSize(parsed.data.heightCm, parsed.data.weightKg);
  return Response.json({ size });
}
