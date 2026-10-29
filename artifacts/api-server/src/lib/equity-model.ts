import type { EquityIssuer, EquityProduct, EquityStock } from "@workspace/api-zod";
import type { CmcAsset, CmcIssuer } from "./cmc";

export const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export const sumKnown = (values: (number | null)[]): number | null => {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
};

/** Names are not identity. crypto_id is a product, not one record per contract. */
export function buildMatrix(catalog: CmcAsset[], quotes: CmcAsset[], issuerRows: CmcIssuer[]) {
  const stockMap = new Map(catalog.filter(row => row.asset_type === "stock" && row.has_tokens)
    .map(row => [row.rwa_id, row]));
  const issuerMap = new Map(issuerRows.map(row => [row.issuer_id, row]));
  // Source explicitly classifies these as derivatives, not tokenized stock products.
  const derivativeIssuers = new Set(issuerRows.filter(row => /\bderivatives?\b/i.test(row.name))
    .map(row => row.issuer_id));
  const products = new Map<number, EquityProduct>();
  const stocks: EquityStock[] = [];
  const warnings: string[] = [];
  let excludedDerivatives = 0;
  for (const quote of quotes) {
    const asset = stockMap.get(quote.rwa_id);
    if (!asset || quote.asset_type !== "stock") continue;
    for (const token of quote.tokens ?? []) {
      if (!token.issuer_id || !Number.isInteger(token.crypto_id)) continue;
      if (derivativeIssuers.has(token.issuer_id) || /\bderivatives?\b/i.test(token.issuer_name)) {
        excludedDerivatives++; continue;
      }
      const previous = products.get(token.crypto_id);
      if (previous) {
        if (previous.stockId !== asset.rwa_id) {
          throw new Error("A source product maps to multiple underlying stocks; data needs review.");
        }
        continue;
      }
      if (!issuerMap.has(token.issuer_id)) {
        issuerMap.set(token.issuer_id, { issuer_id: token.issuer_id, name: token.issuer_name });
      }
      products.set(token.crypto_id, {
        id: token.crypto_id, stockId: asset.rwa_id, issuerId: token.issuer_id,
        name: token.name, symbol: token.symbol, priceUsd: numberOrNull(token.price),
        marketCapUsd: numberOrNull(token.market_cap), volume24hUsd: numberOrNull(token.volume_24h),
        asOf: quote.last_updated ?? null, isWrapped: /^wrapped\b/i.test(token.name),
        networks: [], contracts: [], sourceUrl: `https://coinmarketcap.com/real-world-assets/${asset.slug}/`,
        website: null,
      });
    }
    stocks.push({
      id: asset.rwa_id, name: asset.name, symbol: asset.symbol, slug: asset.slug,
      tokenizedMarketCapUsd: numberOrNull(quote.tokenized_market_cap),
      tokenizedVolume24hUsd: numberOrNull(quote.tokenized_volume_24h),
      asOf: quote.last_updated ?? null, productCount: 0, issuerCount: 0,
    });
  }
  // A source error must not turn a missing batch into an apparently complete universe.
  if (new Set(stocks.map(stock => stock.id)).size !== stockMap.size) {
    throw new Error("CoinMarketCap did not return every requested stock; the matrix refresh is incomplete.");
  }
  const productRows = [...products.values()];
  for (const stock of stocks) {
    const rows = productRows.filter(product => product.stockId === stock.id);
    stock.productCount = rows.length;
    stock.issuerCount = new Set(rows.map(row => row.issuerId)).size;
  }
  const issuers: EquityIssuer[] = [...issuerMap.values()].map(issuer => {
    const rows = productRows.filter(product => product.issuerId === issuer.issuer_id);
    const primary = rows.filter(product => !product.isWrapped);
    return {
      id: issuer.issuer_id, name: issuer.name, website: safeUrl(issuer.website), productCount: rows.length,
      stockCount: new Set(rows.map(product => product.stockId)).size,
      marketCapUsd: sumKnown(primary.map(row => row.marketCapUsd)),
      volume24hUsd: sumKnown(primary.map(row => row.volume24hUsd)),
      missingMarketCapCount: primary.filter(row => row.marketCapUsd === null).length,
    };
  }).filter(row => row.productCount > 0).sort((a, b) => (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1));
  if (excludedDerivatives) warnings.push(`${excludedDerivatives} source-classified derivative products excluded from the product matrix. CMC stock-level aggregates are retained as reported.`);
  warnings.push("CMC-reported stock tokenized totals can include wrapped/derivative coverage. They are not the sum of issuer totals. Issuer totals exclude explicitly named wrapped products; unresolved wrapping may remain.");
  return { stocks, products: productRows, issuers, warnings };
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
