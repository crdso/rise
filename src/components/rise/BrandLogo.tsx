"use client";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { brandForAccount } from "@/lib/brands/registry";

type BrandData = { logoUrl: string | null; iconUrl: string | null; primaryColor: string | null };

/**
 * Cache de módulo: várias contas na tela pedem o mesmo domínio, e sem isto
 * cada tile dispararia seu próprio fetch. Guarda também as promessas em voo
 * para não duplicar requisição concorrente.
 */
const cache = new Map<string, BrandData | null>();
const inflight = new Map<string, Promise<BrandData | null>>();

function loadBrand(domain: string): Promise<BrandData | null> {
  if (cache.has(domain)) return Promise.resolve(cache.get(domain) ?? null);
  const existing = inflight.get(domain);
  if (existing) return existing;

  const p = fetch(`/api/brands/${encodeURIComponent(domain)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const data: BrandData | null = j?.data?.iconUrl || j?.data?.logoUrl ? j.data : null;
      cache.set(domain, data);
      return data;
    })
    .catch(() => {
      cache.set(domain, null);
      return null;
    })
    .finally(() => inflight.delete(domain));

  inflight.set(domain, p);
  return p;
}

/** Logo.dev é o segundo provedor. O token dele é público por design (client-side). */
function logoDevUrl(domain: string, size: number) {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return null;
  const params = new URLSearchParams({
    token,
    size: String(size * 2),
    format: "png",
    // "dark" pede a variante que funciona sobre fundo escuro — o RISE é dark-only
    theme: "dark",
    retina: "true",
    fallback: "monogram",
  });
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

/**
 * Logo de instituição financeira.
 *
 * Cascata: Brandfetch (via rota server-side, a chave fica no servidor)
 *          → Logo.dev → monograma com a cor da marca.
 * Nunca renderiza imagem quebrada e nunca usa ícone genérico de banco
 * para uma instituição conhecida.
 */
export function BrandLogo({
  domain,
  name,
  size = 32,
  color,
  className,
  /** true para contas sem marca (dinheiro, carteira): aqui ícone É o certo. */
  generic,
}: {
  domain: string | null;
  name: string;
  size?: number;
  color?: string | null;
  className?: string;
  generic?: boolean;
}) {
  const [brand, setBrand] = useState<BrandData | null>(() => (domain ? (cache.get(domain) ?? null) : null));
  const [loading, setLoading] = useState(() => !!domain && !cache.has(domain));
  const [imgFailed, setImgFailed] = useState(false);
  const [logoDevFailed, setLogoDevFailed] = useState(false);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setImgFailed(false);
    setLogoDevFailed(false);
    if (cache.has(domain)) {
      setBrand(cache.get(domain) ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadBrand(domain).then((d) => {
      if (cancelled) return;
      setBrand(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const box = { width: size, height: size };
  const initials =
    name
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .trim()
      .slice(0, 2)
      .toUpperCase() || "?";

  // conta sem marca (dinheiro, carteira)
  if (generic || !domain) {
    return (
      <span
        className={`grid place-items-center rounded-xl border border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)] ${className || ""}`}
        style={box}
        aria-label={name}
      >
        {generic ? (
          <Wallet style={{ width: size * 0.45, height: size * 0.45 }} />
        ) : (
          <span className="text-[10px] font-bold">{initials}</span>
        )}
      </span>
    );
  }

  if (loading) {
    return (
      <span
        className={`animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card-soft)] ${className || ""}`}
        style={box}
        aria-label="Carregando logo"
      />
    );
  }

  const brandSrc = !imgFailed ? brand?.iconUrl || brand?.logoUrl : null;
  if (brandSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brandSrc}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`rounded-xl object-contain bg-white p-[3px] ${className || ""}`}
        style={box}
      />
    );
  }

  const devUrl = !logoDevFailed ? logoDevUrl(domain, size) : null;
  if (devUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={devUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setLogoDevFailed(true)}
        className={`rounded-xl object-contain ${className || ""}`}
        style={box}
      />
    );
  }

  // Monograma com a cor da marca: marcador honesto, não uma logo imitada.
  return (
    <span
      className={`grid place-items-center rounded-xl border font-bold ${className || ""}`}
      style={{
        ...box,
        background: color ? `color-mix(in srgb, ${color} 22%, var(--card-soft))` : "var(--card-soft)",
        borderColor: color ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--border)",
        color: "var(--foreground)",
        fontSize: Math.max(9, Math.round(size * 0.34)),
      }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}

/** Logo + nome — usado em seletores de conta e no pagamento de dívida. */
export function BrandBadge({
  account,
  size = 24,
  className,
}: {
  account: { name: string; type?: string; brand_domain?: string | null; brand_key?: string | null };
  size?: number;
  className?: string;
}) {
  const brand = brandForAccount(account);
  const generic = !brand.domain && (account.type === "cash" || account.type === "wallet");
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className || ""}`}>
      <BrandLogo domain={brand.domain} name={brand.name} color={brand.color} size={size} generic={generic} />
      <span className="truncate">{account.name}</span>
    </span>
  );
}
