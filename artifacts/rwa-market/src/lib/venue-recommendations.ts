import type { DemoMarketRow, DemoVenueKind } from '../data/demo-markets.ts';

export type VenuePick = { venue: DemoMarketRow; value: number };
export type VenueRecommendations = {
  kind: DemoVenueKind;
  price: VenuePick | null;
  liquidity: VenuePick | null;
  overall: VenuePick | null;
};

/** Display/reference token price, not an executable ask or share-equivalent cost. */
export function referencePrice(row: DemoMarketRow): number | null {
  return row.priceUsd !== null && Number.isFinite(row.priceUsd) && row.priceUsd > 0 ? row.priceUsd : null;
}

/** CEX: illustrative 0–1000 score. DEX: pool funds in USD. Never compare across kinds. */
export function venueLiquidity(row: DemoMarketRow): number | null {
  const value = row.kind === 'CEX' ? row.liquidityScore : row.poolLiquidityUsd;
  return value !== null && Number.isFinite(value) && value >= 0 &&
    (row.kind !== 'CEX' || value <= 1000) ? value : null;
}

export function hasCompleteMetrics(row: DemoMarketRow): boolean {
  return referencePrice(row) !== null && (venueLiquidity(row) ?? 0) > 0 &&
    Number.isFinite(row.volume24hUsd) && row.volume24hUsd >= 0;
}

function best(picks: VenuePick[], lower: boolean): VenuePick | null {
  return picks.sort((a, b) => (lower ? a.value - b.value : b.value - a.value) ||
    a.venue.key.localeCompare(b.venue.key))[0] ?? null;
}

function normalize(value: number, values: number[], lower: boolean): number {
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return 1;
  return lower ? (max - value) / (max - min) : (value - min) / (max - min);
}

/**
 * Rank the supplied pool separately within CEX and DEX.
 * Overall: 40% lower reference price + 40% type-specific liquidity + 20% 24h volume.
 * Raw token quotes are not verified share-equivalent exposure costs.
 */
export function recommendVenues(rows: readonly DemoMarketRow[]): VenueRecommendations[] {
  return (['CEX', 'DEX'] as const).map(kind => {
    const peers = rows.filter(row => row.kind === kind);
    const price = best(peers.flatMap(venue => {
      const value = referencePrice(venue);
      return value === null ? [] : [{ venue, value }];
    }), true);
    const liquidity = best(peers.flatMap(venue => {
      const value = venueLiquidity(venue);
      return value === null || value === 0 ? [] : [{ venue, value }];
    }), false);
    const eligible = peers.filter(hasCompleteMetrics).map(venue => ({
      venue, price: referencePrice(venue)!, liquidity: venueLiquidity(venue)!,
    }));
    const prices = eligible.map(p => p.price);
    const liquidities = eligible.map(p => p.liquidity);
    const volumes = eligible.map(p => p.venue.volume24hUsd);
    const overall = best(eligible.map(p => ({
      venue: p.venue,
      value: 100 * (
        .4 * normalize(p.price, prices, true) +
        .4 * normalize(p.liquidity, liquidities, false) +
        .2 * normalize(p.venue.volume24hUsd, volumes, false)
      ),
    })), false);
    return { kind, price, liquidity, overall };
  });
}
