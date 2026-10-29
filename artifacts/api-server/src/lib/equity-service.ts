import type {
  EquityDetail, EquityIssuerDetail, EquityProduct, EquityProfile, EquityUniverse, MarketAccess,
} from "@workspace/api-zod";
import { cached, METADATA_TTL, QUOTE_TTL } from "./equity-cache";
import { cmc, CmcError, issuerCatalog, stockCatalog, tokenMetadata, type CmcAsset, type CmcMetadata } from "./cmc";
import { buildMatrix, safeUrl } from "./equity-model";
import { companyResources } from "./company-resources";

export class NotCoveredError extends Error {}

export async function getUniverse(): Promise<EquityUniverse> {
  const result = await cached("cmc:equity-matrix:v1", QUOTE_TTL, async () => {
    const [catalog, issuerRows] = await Promise.all([stockCatalog(), issuerCatalog()]);
    // Do not rebuild fresh-looking quotes against an incomplete/stale catalog refresh.
    if (catalog.stale || issuerRows.stale) throw new Error("The source directory could not be refreshed.");
    const tokenized = catalog.value.filter(row => row.has_tokens);
    const quotes: CmcAsset[] = [];
    for (let start = 0; start < tokenized.length; start += 200) {
      const batch = tokenized.slice(start, start + 200).map(row => row.rwa_id).join(",");
      const data = await cmc<{ rwa_assets: CmcAsset[] }>("/v5/real-world-assets/quotes/latest", { rwa_id: batch });
      if (!Array.isArray(data.rwa_assets)) throw new Error("CoinMarketCap's quote format changed.");
      quotes.push(...data.rwa_assets);
    }
    const matrix = buildMatrix(catalog.value, quotes, issuerRows.value);
    return { ...matrix, catalogStockCount: catalog.value.length };
  });
  return {
    stocks: result.value.stocks, products: result.value.products, issuers: result.value.issuers,
    source: {
      provider: "CoinMarketCap Pro API",
      url: "https://coinmarketcap.com/real-world-assets/",
      fetchedAt: result.fetchedAt, expiresAt: result.expiresAt,
      state: result.stale ? "stale" : "cached",
      catalogStockCount: result.value.catalogStockCount,
      tokenizedStockCount: result.value.stocks.length,
      warnings: [
        ...(result.stale ? ["Refresh failed. Last successful cached quotes are shown; they may be out of date."] : []),
        ...result.value.warnings,
      ],
    },
  };
}

async function marketAccess(): Promise<MarketAccess> {
  try {
    const result = await cached("cmc:market-access:v1", QUOTE_TTL, async (): Promise<MarketAccess> => {
      const checkedAt = new Date().toISOString();
      const sourceUrl = "https://coinmarketcap.com/api/real-world-assets-api";
      try {
        await cmc("/v5/real-world-assets/market-pairs/list", { rwa_id: "14", limit: "1" });
        // Approved delivery is the existing-permission scope, not an unverified pairs parser.
        return {
          status: "available", checkedAt, sourceUrl,
          message: "Market API access is now available. Venue-level ingestion is not enabled in this delivery. Visit the token's CMC Markets page for market details.",
        };
      } catch (error) {
        if (error instanceof CmcError && error.status === 403) return {
          status: "restricted", checkedAt, sourceUrl,
          message: "The connected CMC subscription does not include market-pair data (HTTP 403). CEX/DEX venues, spread, depth and liquidity rankings are not available in this delivery. No market data has been simulated.",
        };
        throw error;
      }
    });
    return result.stale ? {
      ...result.value, status: "unavailable",
      message: "Market access could not be rechecked. Last access check is shown; venue data is unavailable.",
    } : result.value;
  } catch {
    return {
      status: "unavailable", checkedAt: null, sourceUrl: "https://coinmarketcap.com/api/real-world-assets-api",
      message: "Market access could not be checked. Venue data is unavailable, not zero.",
    };
  }
}

function withMetadata(product: EquityProduct, info?: CmcMetadata): EquityProduct {
  if (!info) return product;
  const explorers = (info.urls?.explorer ?? []).map(safeUrl).filter((url): url is string => !!url);
  const contracts = (info.contract_address ?? []).filter(row => row.contract_address && row.platform?.name)
    .map(row => ({
      network: row.platform.name,
      address: row.contract_address,
      // Require exact trailing address; don't assign a matching EVM address on the wrong network.
      explorerUrl: explorers.find(url => {
        const pathname = new URL(url).pathname;
        const lastSegment = pathname.split("/").filter(Boolean).at(-1);
        const addressMatches = row.contract_address.startsWith("0x")
          ? lastSegment?.toLowerCase() === row.contract_address.toLowerCase()
          : lastSegment === row.contract_address;
        return addressMatches && explorerMatchesNetwork(url, row.platform.name);
      }) ?? null,
    }));
  const deduped = [...new Map(contracts.map(contract => [`${contract.network}:${contract.address}`, contract])).values()];
  return {
    ...product, contracts: deduped, networks: [...new Set(deduped.map(contract => contract.network))],
    website: safeUrl(info.urls?.website?.[0]),
    sourceUrl: info.slug
      ? `https://coinmarketcap.com/currencies/${encodeURIComponent(info.slug)}/`
      : product.sourceUrl,
  };
}

function explorerMatchesNetwork(url: string, network: string): boolean {
  const hosts: Record<string, string[]> = {
    Ethereum: ["etherscan.io"], Solana: ["solscan.io", "explorer.solana.com"],
    Arbitrum: ["arbiscan.io", "www.arbiscan.io"], "BNB Smart Chain (BEP20)": ["bscscan.com"],
    HyperEVM: ["hyperevmscan.io"], Ink: ["explorer.inkonchain.com"], TON: ["tonviewer.com", "tonscan.org"],
    "X Layer": ["www.oklink.com", "oklink.com", "web3.okx.com"],
    Base: ["basescan.org"], Polygon: ["polygonscan.com"], Optimism: ["optimistic.etherscan.io"],
  };
  return hosts[network]?.includes(new URL(url).hostname) ?? false;
}

async function enrich(products: EquityProduct[]) {
  if (!products.length) return { products, warning: null };
  try {
    const metadata = await tokenMetadata(products.map(product => product.id));
    return {
      products: products.map(product => withMetadata(product, metadata.records[String(product.id)])),
      warning: metadata.stale ? "Contract metadata refresh failed; last successful metadata is shown." : null,
    };
  } catch (error) {
    return {
      products,
      warning: error instanceof CmcError ? error.message
        : "Contract metadata could not be loaded. Networks and contract addresses are unavailable, not assumed.",
    };
  }
}

async function profileFor(id: number): Promise<{ profile: EquityProfile; warning: string | null }> {
  let info: CmcAsset | undefined;
  let warning: string | null = null;
  try {
    const result = await cached(`cmc:company:v1:${id}`, METADATA_TTL, () =>
      cmc<{ rwa_assets: CmcAsset[] }>("/v5/real-world-assets/info", { rwa_id: String(id) }));
    info = result.value.rwa_assets.find(row => row.rwa_id === id && row.asset_type === "stock");
    if (result.stale) warning = "Company metadata could not be refreshed; cached company information is shown.";
  } catch {
    warning = "Company metadata is temporarily unavailable.";
  }
  const official = companyResources[id];
  const description = info?.about?.description?.split(/\n\s*\n/)
    .find(paragraph => paragraph.trim() && !paragraph.trim().startsWith("#"))
    ?.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").slice(0, 450) ?? null;
  return {
    profile: {
      exchange: info?.primary_exchange ?? null, industry: info?.industry ?? null,
      description: official?.description ?? description,
      website: safeUrl(info?.website ?? info?.about?.website),
      investorRelationsUrl: official?.investorRelationsUrl ?? null,
      financialsUrl: official?.financialsUrl ?? null,
      secUrl: info?.cik && /^\d{1,10}$/.test(info.cik)
        ? `https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(info.cik)}&owner=exclude` : null,
      stockPriceUsd: null, equityMarketCapUsd: null,
    },
    warning,
  };
}

export async function getStockDetail(id: number): Promise<EquityDetail> {
  const universe = await getUniverse();
  const stock = universe.stocks.find(row => row.id === id);
  if (!stock) throw new NotCoveredError("This stock is not in the tokenized-equity directory.");
  const [metadata, profile, access] = await Promise.all([
    enrich(universe.products.filter(product => product.stockId === id)), profileFor(id), marketAccess(),
  ]);
  return {
    stock, profile: profile.profile, products: metadata.products, source: universe.source,
    marketAccess: access,
    metadataWarning: [metadata.warning, profile.warning].filter(Boolean).join(" ") || null,
  };
}

export async function getIssuerDetail(id: string): Promise<EquityIssuerDetail> {
  const universe = await getUniverse();
  const issuer = universe.issuers.find(row => row.id === id);
  if (!issuer) throw new NotCoveredError("This issuer has no covered stock products.");
  const [metadata, access] = await Promise.all([
    enrich(universe.products.filter(product => product.issuerId === id)), marketAccess(),
  ]);
  const stockIds = new Set(metadata.products.map(product => product.stockId));
  return {
    issuer, products: metadata.products, stocks: universe.stocks.filter(stock => stockIds.has(stock.id)),
    source: universe.source, marketAccess: access, metadataWarning: metadata.warning,
  };
}
