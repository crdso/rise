"use client";
import { useEffect, useState } from "react";

type Props = {
  domain: string | null;
  name: string;
  size?: number; // px
  className?: string;
};

type BrandData = {
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
};

function logoDevUrl(domain: string, size: number) {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return null;
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}&size=${size*2}&format=png&theme=auto&retina=true&fallback=monogram`;
}

export function BrandLogo({ domain, name, size = 32, className }: Props) {
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandFailed, setBrandFailed] = useState(false);
  const [logoDevFailed, setLogoDevFailed] = useState(false);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      setBrandFailed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setBrandFailed(false);
    setLogoDevFailed(false);
    fetch(`/api/brands/${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.data?.iconUrl || j.data?.logoUrl) setBrand(j.data);
        else setBrandFailed(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBrandFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [domain]);

  const initials = name.slice(0,2).toUpperCase();

  if (!domain) {
    return (
      <div className={`grid place-items-center rounded-lg bg-[var(--card-soft)] border border-[var(--border)] text-[10px] font-bold text-[var(--muted-foreground)] ${className || ""}`} style={{ width: size, height: size }} aria-label={name}>{initials}</div>
    );
  }

  if (loading) {
    return <div className={`animate-pulse rounded-lg bg-[var(--card-soft)] border border-[var(--border)] ${className || ""}`} style={{ width: size, height: size }} aria-label="Carregando" />;
  }

  // 1. Brandfetch success
  if (!brandFailed && brand?.iconUrl) {
    return (
      <img
        src={brand.iconUrl}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
        onError={() => setBrandFailed(true)}
        loading="lazy"
      />
    );
  }

  // 2. Logo.dev fallback (só após Brandfetch falhar)
  if (brandFailed) {
    const url = logoDevUrl(domain, size);
    if (url && !logoDevFailed) {
      return (
        <img
          src={url}
          alt={name}
          width={size}
          height={size}
          className={`rounded-lg object-contain bg-white ${className || ""}`}
          style={{ width: size, height: size }}
          onError={() => setLogoDevFailed(true)}
          loading="lazy"
        />
      );
    }
  }

  // 3. fallback iniciais discreto
  return (
    <div
      className={`grid place-items-center rounded-lg bg-[var(--card-soft)] border border-[var(--border)] text-[10px] font-bold text-[var(--muted-foreground)] ${className || ""}`}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
