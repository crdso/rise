import { FINANCIAL_BRANDS, normalizeName } from "@/lib/brands/registry";
import type { TransferAccountResolution } from "./types";

function brandKey(name: string) {
  const normalized = normalizeName(name);
  return Object.entries(FINANCIAL_BRANDS).find(([, brand]) =>
    normalizeName(brand.name) === normalized || brand.aliases.some(alias => normalizeName(alias) === normalized))?.[0];
}

// Consider ALL exact/alias candidates; never silently pick the first account.
export function resolveTransferAccount(name: string | null, accounts: Array<{ id: string; name: string }>): TransferAccountResolution {
  const requested = name?.trim() || "";
  const brand = brandKey(requested);
  const matches = accounts.filter(account => normalizeName(account.name) === normalizeName(requested)
    || (!!brand && brandKey(account.name) === brand));
  if (matches.length === 1) return { status: "existing", id: matches[0].id, name: matches[0].name };
  return { status: matches.length ? "ambiguous" : "missing", name: requested };
}
