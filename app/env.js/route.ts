// app/env.js/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const apiBase = String(process.env.NEXT_PUBLIC_API_BASE || "").trim();

  const body =
    `window.__ENV__ = window.__ENV__ || {};\n` +
    `window.__ENV__.NEXT_PUBLIC_API_BASE = ${JSON.stringify(apiBase)};\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
