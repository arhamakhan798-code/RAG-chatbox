import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl && !backendUrl.includes("127.0.0.1:8000") && !backendUrl.includes("localhost:8000")) {
    try {
      const res = await fetch(`${backendUrl}/api/health`);
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {
      // Fall through to native status
    }
  }

  return NextResponse.json({
    status: "ok",
    groq_ready: Boolean(process.env.GROQ_API_KEY),
    openai_ready: Boolean(process.env.OPENAI_API_KEY),
    gemini_ready: Boolean(process.env.GEMINI_API_KEY),
    qdrant_ready: true,
  });
}
