import { useMemo } from 'react';
import type { DemoMarketRow } from '@/data/demo-markets';
import { indicativeAsk, recommendVenues, venueDepth, type VenuePick } from '@/lib/venue-recommendations';
import { tokenPrice, usd } from '@/lib/format';

type Metric = 'price' | 'liquidity' | 'overall';
const METRICS: { m: Metric; label: string; reason: string }[] = [
  { m: 'price', label: 'Best Price', reason: 'Lowest indicative buy-side ask among peers' },
  { m: 'liquidity', label: 'Best Liquidity', reason: 'Highest combined ±2% bid + ask depth' },
  { m: 'overall', label: 'Best Overall', reason: 'Top weighted peer score (40/40/20)' },
];

function VenueLine({ v }: { v: DemoMarketRow }) {
  return (
    <span className="vr-venue">
      <b>{v.venue}</b>
      {v.network && <span className="net">{v.network}</span>}
      <span className="mono vr-pair">{v.pair}</span>
    </span>
  );
}

function Pick({ metric, label, reason, pick, peers, kind }: { metric: Metric; label: string; reason: string; pick: VenuePick | null; peers: number; kind: string }) {
  const id = `${kind.toLowerCase()}-${metric}`;
  if (!pick) {
    return (
      <div className="vr-pick na" data-testid={`card-rec-${id}`}>
        <span className="vr-label">{label} {kind}</span>
        <span className="vr-none" data-testid={`text-rec-${id}-unavailable`}>
          Unavailable{metric === 'liquidity' ? ': no usable depth data.' : metric === 'overall' ? ': insufficient complete data, no pick made.' : ': no usable demo price, no pick made.'}
        </span>
      </div>
    );
  }
  const v = pick.venue;
  const ask = indicativeAsk(v), depth = venueDepth(v);
  const value = metric === 'price' ? tokenPrice(pick.value) : metric === 'liquidity' ? usd(pick.value) : `${pick.value.toFixed(1)}`;
  return (
    <div className={`vr-pick ${metric}`} data-testid={`card-rec-${id}`}>
      <span className="vr-label">{label} {kind}</span>
      <div className="vr-main">
        <VenueLine v={v} />
        <b className="mono vr-value" data-testid={`text-rec-${id}-value`}>{value}{metric === 'overall' && <small>/100</small>}</b>
      </div>
      <span className="vr-ev mono">
        ask {ask === null ? 'N/A' : tokenPrice(ask)} · depth {depth === null ? 'N/A' : usd(depth)} · {v.spreadBps.toFixed(1)} bps
      </span>
      <span className="vr-reason">{reason}{peers <= 1 ? ' — only one candidate, no real comparison.' : ` across ${peers} ${kind} candidates.`}</span>
    </div>
  );
}

export function VenueRecommendations({ rows, symbol }: { rows: readonly DemoMarketRow[]; symbol: string }) {
  const recs = useMemo(() => recommendVenues(rows), [rows]);
  return (
    <section className="vr" aria-labelledby="vr-title" data-testid="panel-venue-recommendations">
      <div className="vr-head">
        <h5 id="vr-title">Venue picks for <span className="mono">{symbol}</span></h5>
        <span className="demo-pill vr-pill">Demo · Illustrative</span>
      </div>
      <div className="vr-groups">
        {recs.map(r => {
          const peers = rows.filter(x => x.kind === r.kind);
          const complete = peers.filter(x => indicativeAsk(x) !== null && (venueDepth(x) ?? 0) > 0).length;
          return (
            <div key={r.kind} className="vr-group" data-testid={`group-rec-${r.kind.toLowerCase()}`}>
              <div className="vr-ghead">
                <span className={`demo-kind ${r.kind.toLowerCase()}`}>{r.kind}</span>
                <span className="vr-count">{peers.length} venue{peers.length === 1 ? '' : 's'} · {complete} with complete data</span>
              </div>
              {peers.length === 0 ? (
                <p className="vr-none vr-nocov" data-testid={`text-rec-${r.kind.toLowerCase()}-nocoverage`}>
                  No {r.kind} coverage: this product has no contract network for a demo pool, so no {r.kind} picks are made.
                </p>
              ) : (
                METRICS.map(x => <Pick key={x.m} metric={x.m} label={x.label} reason={x.reason} pick={r[x.m]} peers={x.m === 'overall' ? complete : x.m === 'price' ? peers.filter(p => indicativeAsk(p) !== null).length : peers.filter(p => (venueDepth(p) ?? 0) > 0).length} kind={r.kind} />)
              )}
            </div>
          );
        })}
      </div>
      <details className="vr-method" data-testid="details-rec-methodology">
        <summary>How picks are ranked</summary>
        <ul>
          <li><b>Price:</b> indicative ask = demo mid × (1 + spread in bps / 20,000). Not executable; excludes fees, gas and slippage.</li>
          <li><b>Liquidity:</b> sum of simulated bid −2% and ask +2% depth.</li>
          <li><b>Overall:</b> 0–100 score, 40% lower ask, 40% higher depth, 20% lower spread, min/max normalized separately within CEX and DEX complete-data peers. A lone peer scores 100. Ties break by stable venue key.</li>
          <li>Picks use all venues for this product regardless of the list filter. Fictional data; no live quotes or execution guarantee.</li>
        </ul>
      </details>
    </section>
  );
}
