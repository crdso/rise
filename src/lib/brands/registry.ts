/**
 * Registro de instituições financeiras.
 *
 * O que fica guardado na conta é o DOMÍNIO da marca — nunca uma URL de logo,
 * que expira. A imagem é resolvida em tempo de exibição por Brandfetch e,
 * na falta dela, por Logo.dev.
 *
 * Regras de produto:
 *  - Banco conhecido nunca cai em ícone genérico de banco.
 *  - Nunca desenhar uma "logo parecida": o fallback é um monograma neutro
 *    com a cor da marca, que é claramente um marcador, não uma imitação.
 *  - Dinheiro/carteira não é marca: usa ícone do Lucide, e isso é correto.
 */

export type BrandKey =
  | "inter"
  | "nubank"
  | "mercadopago"
  | "bb"
  | "itau"
  | "bradesco"
  | "santander"
  | "caixa"
  | "c6"
  | "picpay"
  | "pagbank"
  | "neon"
  | "will"
  | "next"
  | "btg"
  | "xp"
  | "sicoob"
  | "sicredi"
  | "pan"
  | "safra"
  | "original"
  | "wise"
  | "nomad";

export type BrandDef = {
  name: string;
  domain: string;
  /** cor de apoio do monograma quando nenhum provedor devolve imagem */
  color: string;
  /** termos que identificam a marca a partir do nome digitado pelo usuário */
  aliases: string[];
};

export const FINANCIAL_BRANDS: Record<BrandKey, BrandDef> = {
  inter: { name: "Inter", domain: "inter.co", color: "#FF7A00", aliases: ["inter", "banco inter"] },
  nubank: { name: "Nubank", domain: "nubank.com.br", color: "#820AD1", aliases: ["nubank", "nu", "nu bank", "roxinho"] },
  mercadopago: {
    name: "Mercado Pago",
    domain: "mercadopago.com.br",
    color: "#00B1EA",
    aliases: ["mercado pago", "mercadopago", "mp", "meli"],
  },
  bb: { name: "Banco do Brasil", domain: "bb.com.br", color: "#FAE128", aliases: ["banco do brasil", "bb"] },
  itau: {
    name: "Itaú",
    domain: "itau.com.br",
    color: "#EC7000",
    aliases: ["itau", "itaú", "itau unibanco", "itaú unibanco"],
  },
  bradesco: { name: "Bradesco", domain: "bradesco.com.br", color: "#CC092F", aliases: ["bradesco"] },
  santander: { name: "Santander", domain: "santander.com.br", color: "#EC0000", aliases: ["santander"] },
  caixa: {
    name: "Caixa",
    domain: "caixa.gov.br",
    color: "#005CA9",
    aliases: ["caixa", "caixa economica", "caixa econômica", "cef"],
  },
  c6: { name: "C6 Bank", domain: "c6bank.com.br", color: "#3C3C3C", aliases: ["c6", "c6 bank", "c six"] },
  picpay: { name: "PicPay", domain: "picpay.com", color: "#21C25E", aliases: ["picpay", "pic pay"] },
  pagbank: {
    name: "PagBank",
    domain: "pagbank.com.br",
    color: "#0FA958",
    aliases: ["pagbank", "pag bank", "pagseguro", "pag seguro"],
  },
  neon: { name: "Neon", domain: "neon.com.br", color: "#00A5E3", aliases: ["neon"] },
  will: { name: "Will Bank", domain: "willbank.com.br", color: "#FFD400", aliases: ["will", "will bank", "willbank"] },
  next: { name: "Next", domain: "next.me", color: "#00E7A0", aliases: ["next"] },
  btg: { name: "BTG Pactual", domain: "btgpactual.com", color: "#1B3C73", aliases: ["btg", "btg pactual"] },
  xp: { name: "XP", domain: "xpi.com.br", color: "#2E2E2E", aliases: ["xp", "xp investimentos"] },
  sicoob: { name: "Sicoob", domain: "sicoob.com.br", color: "#00A499", aliases: ["sicoob"] },
  sicredi: { name: "Sicredi", domain: "sicredi.com.br", color: "#3FA110", aliases: ["sicredi"] },
  pan: { name: "Banco Pan", domain: "bancopan.com.br", color: "#00A9E0", aliases: ["pan", "banco pan"] },
  safra: { name: "Safra", domain: "safra.com.br", color: "#1B3A63", aliases: ["safra", "banco safra"] },
  original: { name: "Original", domain: "original.com.br", color: "#00A868", aliases: ["original", "banco original"] },
  wise: { name: "Wise", domain: "wise.com", color: "#7DD957", aliases: ["wise", "transferwise"] },
  nomad: { name: "Nomad", domain: "nomadglobal.com", color: "#2B2B2B", aliases: ["nomad"] },
};

/** Remove acentos e normaliza espaços para casar "Itaú" com "itau". */
export function normalizeName(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Descobre a marca a partir do nome digitado.
 * Casa alias como palavra inteira, nunca como substring solta — assim
 * "Conta corrente" não vira "Banco Pan" só porque contém as letras de "pan".
 */
export function inferBrandKey(rawName: string): BrandKey | null {
  const name = normalizeName(rawName);
  if (!name) return null;

  let best: { key: BrandKey; score: number } | null = null;
  for (const [key, brand] of Object.entries(FINANCIAL_BRANDS) as Array<[BrandKey, BrandDef]>) {
    for (const alias of brand.aliases) {
      const a = normalizeName(alias);
      let score = 0;
      if (name === a) score = 1000;
      else if (new RegExp(`(^|\\s)${escapeRe(a)}(\\s|$)`).test(name)) score = 100 + a.length;
      if (score && (!best || score > best.score)) best = { key, score };
    }
  }
  return best?.key ?? null;
}

export type ResolvedBrand = { key: BrandKey | null; name: string; domain: string | null; color: string | null };

/**
 * Resolve a identidade visual de uma conta.
 * Ordem: chave salva → domínio salvo → inferência pelo nome → sem marca.
 */
export function brandForAccount(account: {
  name: string;
  brand_domain?: string | null;
  brand_key?: string | null;
}): ResolvedBrand {
  if (account.brand_key && account.brand_key in FINANCIAL_BRANDS) {
    const b = FINANCIAL_BRANDS[account.brand_key as BrandKey];
    return {
      key: account.brand_key as BrandKey,
      name: b.name,
      domain: account.brand_domain || b.domain,
      color: b.color,
    };
  }
  if (account.brand_domain) {
    const found = (Object.entries(FINANCIAL_BRANDS) as Array<[BrandKey, BrandDef]>).find(
      ([, b]) => b.domain === account.brand_domain
    );
    return {
      key: found?.[0] ?? null,
      name: found?.[1].name ?? account.name,
      domain: account.brand_domain,
      color: found?.[1].color ?? null,
    };
  }
  const inferred = inferBrandKey(account.name);
  if (inferred) {
    const b = FINANCIAL_BRANDS[inferred];
    return { key: inferred, name: b.name, domain: b.domain, color: b.color };
  }
  return { key: null, name: account.name, domain: null, color: null };
}

/** Lista para seletores, em ordem alfabética. */
export const BRAND_OPTIONS: Array<{ key: BrandKey } & BrandDef> = (
  Object.entries(FINANCIAL_BRANDS) as Array<[BrandKey, BrandDef]>
)
  .map(([key, b]) => ({ key, ...b }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
