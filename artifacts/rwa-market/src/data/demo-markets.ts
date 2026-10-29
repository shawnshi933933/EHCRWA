/**
 * ILLUSTRATIVE DEMO DATA ONLY. Not real venues, not live, not from CoinMarketCap.
 * Pure, deterministic per product ID. Visual prototype for the Market Map column 03.
 */

export type DemoMarketInput = {
  id: number;
  symbol: string;
  priceUsd: number | null;
  networks: readonly string[];
  contracts: readonly { network: string }[];
};

export type DemoVenueKind = 'CEX' | 'DEX';

export type DemoMarketRow = {
  key: string;
  venue: string;
  kind: DemoVenueKind;
  pair: string;
  network: string | null;
  priceUsd: number | null;
  volume24hUsd: number;
  spreadBps: number;
  depthBidUsd: number;
  depthAskUsd: number;
};

export type DemoMarketSummary = {
  venueCount: number;
  cexCount: number;
  dexCount: number;
  volume24hUsd: number;
  depthTotalUsd: number;
  medianSpreadBps: number | null;
};

export type DemoMarketSet = {
  productId: number;
  isDemo: true;
  basePriceUsd: number | null;
  rows: DemoMarketRow[];
};

export type DemoFilter = 'all' | DemoVenueKind;

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, step: number) => Math.round(n / step) * step;
const QUOTES_CEX = ['USDT', 'USD', 'USDC'];
const QUOTES_DEX = ['USDC', 'USDT'];

export function buildDemoMarkets(p: DemoMarketInput): DemoMarketSet {
  const r = rng(p.id * 2654435761 + p.symbol.length * 97);
  const nets = [...new Set([...p.networks, ...p.contracts.map(c => c.network)].filter(Boolean))];
  const sym = p.symbol || `ID${p.id}`;
  const base = p.priceUsd !== null && Number.isFinite(p.priceUsd) && p.priceUsd > 0 ? p.priceUsd : null;
  const cexN = 2 + Math.floor(r() * 2);
  const dexN = nets.length ? Math.min(4, Math.max(1, nets.length) + Math.floor(r() * 2)) : 0;
  const rows: DemoMarketRow[] = [];

  const mk = (kind: DemoVenueKind, i: number, network: string | null, quote: string) => {
    const spreadBps = kind === 'CEX' ? round(4 + r() * 22, 0.1) : round(12 + r() * 60, 0.1);
    const scale = kind === 'CEX' ? 180_000 + r() * 2_400_000 : 25_000 + r() * 620_000;
    const volume24hUsd = round(scale, 10);
    const depthFactor = kind === 'CEX' ? 0.04 + r() * 0.09 : 0.08 + r() * 0.2;
    const depthBidUsd = round(volume24hUsd * depthFactor, 10);
    const depthAskUsd = round(depthBidUsd * (0.78 + r() * 0.44), 10);
    const drift = (r() - 0.5) * 0.006;
    rows.push({
      key: `${kind}-${i}-${network ?? 'na'}`,
      venue: `Demo ${kind} ${String(i + 1).padStart(2, '0')}`,
      kind,
      pair: `${sym}/${quote}`,
      network,
      priceUsd: base === null ? null : base * (1 + drift),
      volume24hUsd, spreadBps, depthBidUsd, depthAskUsd,
    });
  };

  for (let i = 0; i < cexN; i++) mk('CEX', i, null, QUOTES_CEX[Math.floor(r() * QUOTES_CEX.length)]);
  for (let i = 0; i < dexN; i++) mk('DEX', i, nets[i % nets.length], QUOTES_DEX[Math.floor(r() * QUOTES_DEX.length)]);
  rows.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
  return { productId: p.id, isDemo: true, basePriceUsd: base, rows };
}

export function filterDemoMarkets(rows: readonly DemoMarketRow[], f: DemoFilter): DemoMarketRow[] {
  return f === 'all' ? [...rows] : rows.filter(x => x.kind === f);
}

export function summarizeDemoMarkets(rows: readonly DemoMarketRow[]): DemoMarketSummary {
  const sp = rows.map(x => x.spreadBps).sort((a, b) => a - b);
  const mid = sp.length ? (sp.length % 2 ? sp[(sp.length - 1) / 2] : (sp[sp.length / 2 - 1] + sp[sp.length / 2]) / 2) : null;
  return {
    venueCount: rows.length,
    cexCount: rows.filter(x => x.kind === 'CEX').length,
    dexCount: rows.filter(x => x.kind === 'DEX').length,
    volume24hUsd: rows.reduce((a, x) => a + x.volume24hUsd, 0),
    depthTotalUsd: rows.reduce((a, x) => a + x.depthBidUsd + x.depthAskUsd, 0),
    medianSpreadBps: mid,
  };
}
