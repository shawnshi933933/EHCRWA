import { cached, METADATA_TTL } from "./equity-cache";

export interface CmcAsset {
  rwa_id: number; name: string; symbol: string; slug: string; asset_type: string;
  has_tokens: boolean; rwa_rank?: number;
  tokenized_market_cap?: number | null; tokenized_volume_24h?: number | null; last_updated?: string;
  tokens?: CmcToken[]; website?: string; primary_exchange?: string; industry?: string; cik?: string;
  about?: { description?: string; website?: string };
}
export interface CmcToken {
  crypto_id: number; issuer_id: string; issuer_name: string; name: string; symbol: string;
  price?: number | null; market_cap?: number | null; volume_24h?: number | null;
}
export interface CmcIssuer { issuer_id: string; name: string; website?: string }
export interface CmcMetadata {
  slug?: string;
  urls?: { website?: string[]; explorer?: string[] };
  contract_address?: { contract_address: string; platform: { name: string } }[];
}
interface CmcData {
  rwa_assets?: CmcAsset[];
  issuers?: CmcIssuer[];
  total_size?: number;
  has_more?: boolean;
}
export class CmcError extends Error {
  constructor(public status: number, public code: string) {
    super(status === 429 ? "CoinMarketCap rate limit reached. Please try again later."
      : status === 401 ? "CoinMarketCap credentials need attention."
      : status === 403 ? "The connected CoinMarketCap plan does not include this endpoint."
      : "CoinMarketCap is temporarily unavailable.");
  }
}

/** Fixed upstream host and allowlisted caller paths; key is only sent in a header. */
export async function cmc<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error("CoinMarketCap API key is not configured on the server.");
  const url = new URL(path, "https://pro-api.coinmarketcap.com");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json() as { data: T; status?: { error_code?: string | number } };
  if (!response.ok || Number(body.status?.error_code ?? 0) !== 0) {
    throw new CmcError(response.status, String(body.status?.error_code ?? "unknown"));
  }
  if (!body.data) throw new Error("CoinMarketCap returned an incomplete response.");
  return body.data;
}

/** Walk every page; never represent a truncated first page as the whole catalog. */
export async function paginateCmc<T>(
  path: string, field: "rwa_assets" | "issuers", params: Record<string, string> = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 1; start <= 50_000;) {
    const data = await cmc<CmcData>(path, { ...params, start: String(start), limit: "250" });
    const page = data[field] as T[] | undefined;
    if (!Array.isArray(page)) throw new Error("CoinMarketCap's directory format changed.");
    rows.push(...page);
    if (!data.has_more) return rows;
    if (!page.length) throw new Error("CoinMarketCap returned an incomplete directory page.");
    start += page.length;
  }
  throw new Error("The source directory exceeded the supported pagination limit.");
}

export async function stockCatalog() {
  return cached("cmc:stock-map:v1", METADATA_TTL, async () => {
    const rows = await paginateCmc<CmcAsset>("/v5/real-world-assets/map", "rwa_assets", { asset_type: "stock" });
    return [...new Map(rows.filter(row => row.asset_type === "stock").map(row => [row.rwa_id, row])).values()];
  });
}

export async function issuerCatalog() {
  return cached("cmc:issuer-map:v1", METADATA_TTL, () =>
    paginateCmc<CmcIssuer>("/v5/real-world-assets/issuers/list", "issuers"));
}

export async function tokenMetadata(ids: number[]) {
  const records: Record<string, CmcMetadata> = {};
  let stale = false;
  // Stable batches share the DB cache between stock and issuer views.
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 100) {
    const batch = sorted.slice(i, i + 100).join(",");
    const result = await cached(`cmc:tokens:v1:${batch}`, METADATA_TTL, () =>
      cmc<Record<string, CmcMetadata>>("/v2/cryptocurrency/info", { id: batch }));
    Object.assign(records, result.value);
    stale ||= result.stale;
  }
  return { records, stale };
}
