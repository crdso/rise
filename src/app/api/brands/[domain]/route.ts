import { NextResponse } from "next/server";
import { fetchBrand, normalizeBrandDomain } from "@/lib/brands/brandfetch";
import { createClient } from "@/lib/supabase/server";

// Best-effort per instance: serverless instances do not share this memory.
const requestsByUser = new Map<string, number[]>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function isRateLimited(userId: string) {
  const now = Date.now();
  const recent = (requestsByUser.get(userId) ?? []).filter((timestamp) => timestamp > now - WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestsByUser.set(userId, recent);
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(user.id)) return NextResponse.json({ error: "Muitas consultas. Aguarde um minuto." }, { status: 429 });

  const { domain } = await params;
  const sanitized = normalizeBrandDomain(domain);
  if (!sanitized) return NextResponse.json({ error: "Domínio inválido." }, { status: 400 });

  const data = await fetchBrand(sanitized);
  if (!data) return NextResponse.json({ data: null, fallback: true }, { status: 200, headers: { "Cache-Control": "private, no-store" } });

  // retorna apenas campos sanitizados, não resposta bruta
  return NextResponse.json({
    data: {
      name: data.name,
      domain: data.domain,
      logoUrl: data.logoUrl,
      iconUrl: data.iconUrl,
      primaryColor: data.primaryColor,
    },
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
