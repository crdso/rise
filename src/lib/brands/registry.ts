export type BrandKey = "inter" | "nubank" | "mercadopago" | "bb";

export const FINANCIAL_BRANDS: Record<BrandKey, { name: string; domain: string }> = {
  inter: { name: "Inter", domain: "inter.co" },
  nubank: { name: "Nubank", domain: "nubank.com.br" },
  mercadopago: { name: "Mercado Pago", domain: "mercadopago.com.br" },
  bb: { name: "Banco do Brasil", domain: "bb.com.br" },
};

// Verificação Brandfetch/Logo.dev 2026-02:
// - inter.co → logo com ícone laranja, retorna SVG transparente (preferível)
// - nubank.com.br → logo roxa, SVG transparente
// - mercadopago.com.br → Mercado Pago, melhor que mercadolibre.com
// - bb.com.br → Banco do Brasil, Logo.dev fallback funciona (Brandfetch retorna amarelo/azul)
// Alternativas testadas: inter.com.br redireciona, bbb.com.br incorreto.
// Esses domínios retornam melhor identidade visual em ambos providers.

export function brandForAccount(account: { name: string; brand_domain?: string | null; brand_key?: string | null }): { name: string; domain: string | null } | null {
  if (account.brand_domain) return { name: account.name, domain: account.brand_domain };
  if (account.brand_key && FINANCIAL_BRANDS[account.brand_key as BrandKey]) {
    const b = FINANCIAL_BRANDS[account.brand_key as BrandKey];
    return { name: b.name, domain: b.domain };
  }
  // tenta por nome normalizado
  const norm = account.name.toLowerCase().trim();
  for (const b of Object.values(FINANCIAL_BRANDS)) {
    if (norm.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(norm)) return b;
  }
  return null;
}
