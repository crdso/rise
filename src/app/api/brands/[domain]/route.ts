import { NextResponse } from "next/server";
import { fetchBrand } from "@/lib/brands/brandfetch";

export const revalidate = 86400; // 24h

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!domain || domain.length < 3) return NextResponse.json({ error: "invalid domain" }, { status: 400 });

  const sanitized = domain.toLowerCase().trim();
  // sanitiza: apenas a-z0-9.- e tamanho
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(sanitized)) return NextResponse.json({ error: "invalid domain" }, { status: 400 });

  const data = await fetchBrand(sanitized);
  if (!data) return NextResponse.json({ data: null, fallback: true }, { status: 200 });

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
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
