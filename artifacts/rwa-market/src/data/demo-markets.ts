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
  depthBidUsd: number | null;
  depthAskUsd: number | null;
  liquidityScore: number | null;
  poolLiquidityUsd: number | null;
};

export type DemoMarketSummary = {
  venueCount: number;
  cexCount: number;
  dexCount: number;
  volume24hUsd: number;
  cexBidDepthUsd: number | null;
  cexAskDepthUsd: number | null;
  medianCexLiquidityScore: number | null;
  dexPoolLiquidityUsd: number | null;
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
    const scale = kind === 'CEX' ? 180_000 + r() * 2_400_000 : 25_000 + r() * 620_000;
    const volume24hUsd = round(scale, 10);
    const depthFactor = kind === 'CEX' ? 0.04 + r() * 0.09 : 0.08 + r() * 0.2;
    const depthBidUsd = round(volume24hUsd * depthFactor, 10);
    const depthAskUsd = round(depthBidUsd * (0.78 + r() * 0.44), 10);
    const balancedDepth = Math.min(depthBidUsd, depthAskUsd);
    // EHC demo-only score, deliberately not CMC's proprietary methodology.
    const liquidityScore = Math.round(1000 * balancedDepth / (balancedDepth + 100_000));
    const poolLiquidityUsd = round(80_000 + r() * 2_500_000, 10);
    const drift = (r() - 0.5) * 0.006;
    rows.push({
      key: `${kind}-${i}-${network ?? 'na'}`,
      venue: `Demo ${kind} ${String(i + 1).padStart(2, '0')}`,
      kind,
      pair: `${sym}/${quote}`,
      network,
      priceUsd: base === null ? null : base * (1 + drift),
      volume24hUsd,
      depthBidUsd: kind === 'CEX' ? depthBidUsd : null,
      depthAskUsd: kind === 'CEX' ? depthAskUsd : null,
      liquidityScore: kind === 'CEX' ? liquidityScore : null,
      poolLiquidityUsd: kind === 'DEX' ? poolLiquidityUsd : null,
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
  const cex = rows.filter(x => x.kind === 'CEX');
  const dex = rows.filter(x => x.kind === 'DEX');
  const scores = cex.flatMap(x => x.liquidityScore === null ? [] : [x.liquidityScore]).sort((a, b) => a - b);
  const mid = scores.length ? (scores.length % 2 ? scores[(scores.length - 1) / 2] : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2) : null;
  const sumKnown = (values: (number | null)[]) => {
    const known = values.filter((x): x is number => x !== null && Number.isFinite(x) && x >= 0);
    return known.length ? known.reduce((a, x) => a + x, 0) : null;
  };
  return {
    venueCount: rows.length,
    cexCount: rows.filter(x => x.kind === 'CEX').length,
    dexCount: rows.filter(x => x.kind === 'DEX').length,
    volume24hUsd: rows.reduce((a, x) => a + x.volume24hUsd, 0),
    cexBidDepthUsd: sumKnown(cex.map(x => x.depthBidUsd)),
    cexAskDepthUsd: sumKnown(cex.map(x => x.depthAskUsd)),
    medianCexLiquidityScore: mid,
    dexPoolLiquidityUsd: sumKnown(dex.map(x => x.poolLiquidityUsd)),
  };
}
