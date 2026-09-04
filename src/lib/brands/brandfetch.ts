// server-only
import "server-only";

type BrandfetchResponse = {
  name?: string;
  domain?: string;
  logos?: Array<{ type?: string; theme?: string; formats?: Array<{ src: string; background?: string; format?: string }> }>;
  brand?: { colors?: Array<{ hex: string }> };
};

export type BrandInfo = {
  name: string;
  domain: string;
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
};

// cache em memória com TTL 24h
const cache = new Map<string, { data: BrandInfo; expires: number }>();
const TTL = 1000 * 60 * 60 * 24;

function pickLogo(logos?: BrandfetchResponse["logos"]): { logo: string | null; icon: string | null } {
  if (!logos || logos.length === 0) return { logo: null, icon: null };
  // prefere SVG transparente, depois PNG transparente
  const scored = logos.flatMap((l) =>
    (l.formats || []).map((f) => ({
      src: f.src,
      isSvg: f.format === "svg",
      isTransparent: f.background === "transparent",
      isIcon: l.type === "icon",
      isLogo: l.type === "logo",
    }))
  ).sort((a, b) => {
    // transparente primeiro, SVG primeiro
    const score = (x: typeof a) => (x.isTransparent ? 10 : 0) + (x.isSvg ? 5 : 0);
    return score(b) - score(a);
  });

  const logo = scored.find((s) => s.isLogo)?.src || scored.find((s) => !s.isIcon)?.src || null;
  const icon = scored.find((s) => s.isIcon)?.src || null;
  return { logo, icon };
}

export async function fetchBrand(domain: string): Promise<BrandInfo | null> {
  const key = domain.toLowerCase().trim();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return cached.data;

  const secret = process.env.BRANDFETCH_SECRET_API_KEY;
  if (!secret) return null;

  try {
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as BrandfetchResponse;
    const { logo, icon } = pickLogo(json.logos);
    const primaryColor = json.brand?.colors?.[0]?.hex || null;
    const info: BrandInfo = {
      name: json.name || key,
      domain: json.domain || key,
      logoUrl: logo,
      iconUrl: icon || logo,
      primaryColor,
    };
    // só cacheia se tem logo
    if (info.logoUrl || info.iconUrl) cache.set(key, { data: info, expires: now + TTL });
    return info;
  } catch {
    return null;
  }
}
