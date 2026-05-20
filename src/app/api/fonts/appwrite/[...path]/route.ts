export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

const FONT_CDN = "https://assets.appwrite.io/fonts";

const ALLOWED_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf", ".eot"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  const joined = path.join("/");
  const ext = joined.slice(joined.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = `${FONT_CDN}/${joined}`;

  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "force-cache",
    });

    if (!res.ok) {
      return new NextResponse("Upstream error", { status: res.status });
    }

    const body = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "font/woff2";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch font", { status: 502 });
  }
}
