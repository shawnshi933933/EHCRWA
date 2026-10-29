import { useMemo } from 'react';
import { Link } from 'wouter';
import type { EquityIssuer, EquityProduct } from '@workspace/api-client-react';
import { buildStockVenueComparison } from '@/lib/stock-venue-comparison';
import { indicativeAsk, venueDepth, type VenuePick } from '@/lib/venue-recommendations';
import { tokenPrice, usd } from '@/lib/format';

type Metric = 'price' | 'liquidity' | 'overall';
const METRICS: { m: Metric; label: string; reason: string; none: string }[] = [
  { m: 'price', label: 'Best Price', reason: 'Lowest indicative token ask', none: 'no venue has a usable demo price' },
  { m: 'liquidity', label: 'Best Liquidity', reason: 'Highest combined ±2% bid + ask depth', none: 'no venue has usable depth data' },
  { m: 'overall', label: 'Best Overall', reason: 'Top weighted score (40% ask / 40% depth / 20% spread)', none: 'no venue has complete price and depth data' },
];

export function VenueRecommendations({ symbol, products, issuerNames }: { symbol: string; products: readonly EquityProduct[]; issuerNames: Map<string, EquityIssuer> }) {
  const cmp = useMemo(() => buildStockVenueComparison(products, issuerNames), [products, issuerNames]);
  const byKey = useMemo(() => new Map(cmp.rows.map(r => [r.key, r])), [cmp.rows]);
  const kindCount = (k: string) => cmp.rows.filter(r => r.kind === k).length;
  const issuersCovered = new Set(cmp.rows.map(r => r.issuerId)).size;

  const lines = cmp.recommendations.flatMap(rec => METRICS.map(x => ({ kind: rec.kind, ...x, pick: rec[x.m] as VenuePick | null })));

  return (
    <section className="svc" aria-labelledby="svc-title" data-testid="panel-venue-recommendations">
      <div className="svc-head">
        <div>
          <div className="col-label"><span className="mono">↔</span><h2 id="svc-title">Venue comparison · all <span className="mono">{symbol}</span> issuers</h2></div>
          <p className="svc-sub">Every non-wrapped {symbol} product from every covered issuer, not just the Top 5 and independent of the product selected below.</p>
        </div>
        <span className="demo-pill vr-pill">Demo · Illustrative</span>
      </div>
      <div className="svc-cov mono" data-testid="text-comparison-coverage">
        <span><b>{cmp.issuerCount}</b> issuers</span>
        <span><b>{cmp.productCount}</b> products</span>
        <span><b>{issuersCovered}</b> issuers with demo venues</span>
        <span><b>{kindCount('CEX')}</b> CEX · <b>{kindCount('DEX')}</b> DEX venues</span>
        {cmp.excludedWrappedCount > 0 && <span>{cmp.excludedWrappedCount} wrapped excluded</span>}
      </div>
      <p className="svc-warn" role="note" data-testid="text-comparison-limitation">
        <b>Raw token quotes, not share-equivalent.</b> Prices are indicative per-TOKEN asks, unadjusted across issuer wrappers. Shares-per-token ratios are not verified, so tokens from different issuers are not interchangeable and a lower ask is not cheaper exposure. Fees, gas, slippage and eligibility are not included. Not best execution.
      </p>
      <div className="svc-scroll" tabIndex={0} role="region" aria-label="Venue comparison table, scrolls horizontally">
        <table className="svc-table">
          <caption className="sr-only">Demo venue recommendations across all issuers of {symbol}</caption>
          <thead>
            <tr>
              <th scope="col">Pick</th><th scope="col">Issuer</th><th scope="col">Token</th><th scope="col">Venue / pair</th>
              <th scope="col" className="num">Indicative token ask</th><th scope="col" className="num">±2% depth</th><th scope="col" className="num">Spread</th><th scope="col" className="num">Score</th><th scope="col">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const id = `${l.kind.toLowerCase()}-${l.m}`;
              const v = l.pick ? byKey.get(l.pick.venue.key) : undefined;
              const label = <th scope="row"><span className={`demo-kind ${l.kind.toLowerCase()}`}>{l.kind}</span> <span className={`svc-metric ${l.m}`}>{l.label}</span></th>;
              if (!l.pick || !v) {
                const reason = kindCount(l.kind) === 0 ? `No ${l.kind} demo coverage for any ${symbol} product` : l.none;
                return (
                  <tr key={id} className="na" data-testid={`row-rec-${id}`}>
                    {label}
                    <td colSpan={8} className="svc-none" data-testid={`text-rec-${id}-unavailable`}>Unavailable: {reason}. No pick made.</td>
                  </tr>
                );
              }
              const ask = indicativeAsk(v), depth = venueDepth(v);
              const peers = cmp.rows.filter(r => r.kind === l.kind && (
                l.m === 'price' ? indicativeAsk(r) !== null :
                l.m === 'liquidity' ? (venueDepth(r) ?? 0) > 0 :
                indicativeAsk(r) !== null && (venueDepth(r) ?? 0) > 0
              )).length;
              return (
                <tr key={id} data-testid={`row-rec-${id}`}>
                  {label}
                  <td><Link href={`/issuers/${v.issuerId}`} className="text-link" data-testid={`link-rec-issuer-${id}`}>{v.issuerName}</Link></td>
                  <td className="mono" data-testid={`text-rec-${id}-token`}>{v.productSymbol}</td>
                  <td><b>{v.venue}</b>{v.network && <span className="net">{v.network}</span>}<div className="mono svc-dim">{v.pair}</div></td>
                  <td className={`num mono ${l.m === 'price' ? 'hl' : ''}`}>{ask === null ? 'N/A' : tokenPrice(ask)}</td>
                  <td className={`num mono ${l.m === 'liquidity' ? 'hl' : ''}`}>{depth === null ? 'N/A' : usd(depth)}</td>
                  <td className="num mono">{v.spreadBps.toFixed(1)} bps</td>
                  <td className={`num mono ${l.m === 'overall' ? 'hl' : ''}`} data-testid={`text-rec-${id}-value`}>{l.m === 'overall' ? `${l.pick.value.toFixed(1)}/100` : '—'}</td>
                  <td className="svc-why">{l.reason} across {peers} {l.kind} venue{peers === 1 ? '' : 's'}{peers <= 1 ? ' (single candidate, no real comparison)' : ''}.</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="vr-method" data-testid="details-rec-methodology">
        <summary>How picks are ranked</summary>
        <ul>
          <li><b>Scope:</b> all non-wrapped products of this stock across all issuers; no Top 5 cut, no dependence on the selected product or list filter.</li>
          <li><b>Price:</b> indicative token ask = demo mid × (1 + spread bps / 20,000). Raw per-token quote, not adjusted for issuer share ratios; not comparable as share-equivalent price.</li>
          <li><b>Liquidity:</b> sum of simulated bid −2% and ask +2% depth.</li>
          <li><b>Overall:</b> 0–100, 40% lower ask, 40% higher depth, 20% lower spread, min/max normalized within CEX and DEX complete-data peers. A lone peer scores 100 without a real comparison. Ties break by venue key.</li>
          <li>Excludes fees, gas, slippage and eligibility. Fictional demo data; no live quotes, execution or trading.</li>
        </ul>
      </details>
    </section>
  );
}
