import type { DemoMarketRow, DemoVenueKind } from '../data/demo-markets.ts';

export type VenuePick = { venue: DemoMarketRow; value: number };
export type VenueRecommendations = {
  kind: DemoVenueKind;
  price: VenuePick | null;
  liquidity: VenuePick | null;
  overall: VenuePick | null;
};

/** Indicative buy-side quote derived from demo mid and full spread; not an executable ask. */
export function indicativeAsk(row: DemoMarketRow): number | null {
  if (row.priceUsd === null || !Number.isFinite(row.priceUsd) || row.priceUsd <= 0 ||
      !Number.isFinite(row.spreadBps) || row.spreadBps < 0) return null;
  const ask = row.priceUsd * (1 + row.spreadBps / 20_000);
  return Number.isFinite(ask) ? ask : null;
}

export function venueDepth(row: DemoMarketRow): number | null {
  const { depthBidUsd: bid, depthAskUsd: ask } = row;
  return Number.isFinite(bid) && Number.isFinite(ask) && bid >= 0 && ask >= 0 &&
    Number.isFinite(bid + ask) ? bid + ask : null;
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
 * Rank the supplied venue pool separately by venue kind. Callers own the scope
 * and must disclose unadjusted token-price limitations for cross-issuer pools.
 * Overall: 40% indicative buy price + 40% two-sided depth + 20% spread.
 * Min/max normalization within the complete-data peer group; no missing-value imputation.
 */
export function recommendVenues(rows: readonly DemoMarketRow[]): VenueRecommendations[] {
  return (['CEX', 'DEX'] as const).map(kind => {
    const peers = rows.filter(row => row.kind === kind);
    const price = best(peers.flatMap(venue => {
      const value = indicativeAsk(venue);
      return value === null ? [] : [{ venue, value }];
    }), true);
    const liquidity = best(peers.flatMap(venue => {
      const value = venueDepth(venue);
      return value === null || value === 0 ? [] : [{ venue, value }];
    }), false);
    const eligible = peers.flatMap(venue => {
      const ask = indicativeAsk(venue), depth = venueDepth(venue);
      return ask === null || depth === null || depth <= 0 ? [] : [{ venue, ask, depth }];
    });
    const prices = eligible.map(p => p.ask);
    const depths = eligible.map(p => p.depth);
    const spreads = eligible.map(p => p.venue.spreadBps);
    const overall = best(eligible.map(p => ({
      venue: p.venue,
      value: 100 * (
        .4 * normalize(p.ask, prices, true) +
        .4 * normalize(p.depth, depths, false) +
        .2 * normalize(p.venue.spreadBps, spreads, true)
      ),
    })), false);
    return { kind, price, liquidity, overall };
  });
}
