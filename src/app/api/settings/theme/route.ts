import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Nesta etapa apenas confirma recebimento; persistência real em Supabase na próxima iteração com auth
  return NextResponse.json({ ok: true, theme: body.theme });
}
