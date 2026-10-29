import { useMemo } from 'react';
import { Link } from 'wouter';
import type { EquityIssuer, EquityProduct } from '@workspace/api-client-react';
import { buildStockVenueComparison } from '@/lib/stock-venue-comparison';
import { hasCompleteMetrics, referencePrice, venueLiquidity, type VenuePick } from '@/lib/venue-recommendations';
import { tokenPrice, usd } from '@/lib/format';

type Metric = 'price' | 'liquidity' | 'overall';
const METRICS: { m: Metric; label: string; reason: string; none: string }[] = [
  { m: 'price', label: 'Best Price', reason: 'Lowest reference token price', none: 'no venue has a usable demo price' },
  { m: 'liquidity', label: 'Best Liquidity', reason: 'Highest type-specific liquidity (CEX score / DEX pool USD)', none: 'no venue has usable liquidity data' },
  { m: 'overall', label: 'Best Overall', reason: 'Top weighted score (40% price / 40% liquidity / 20% 24h volume)', none: 'no venue has complete price, liquidity and volume data' },
];

export function VenueRecommendations({ symbol, products, issuerNames }: { symbol: string; products: readonly EquityProduct[]; issuerNames: Map<string, EquityIssuer> }) {
  const cmp = useMemo(() => buildStockVenueComparison(products, issuerNames), [products, issuerNames]);
  const byKey = useMemo(() => new Map(cmp.rows.map(r => [r.key, r])), [cmp.rows]);
  const kindCount = (k: string) => cmp.rows.filter(r => r.kind === k).length;
  const issuersCovered = new Set(cmp.rows.map(r => r.issuerId)).size;

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
        <b>Raw token quotes, not share-equivalent.</b> Prices are reference per-TOKEN quotes (not executable asks), unadjusted across issuer wrappers. Shares-per-token ratios are not verified, so tokens from different issuers are not interchangeable and a lower quote is not cheaper exposure. Fees, gas, slippage and eligibility are not included. Not best execution.
      </p>
      <div className="svc-scroll" tabIndex={0} role="region" aria-label="Venue comparison table, scrolls horizontally">
        <table className="svc-table">
          <caption className="sr-only">Demo venue recommendations across all issuers of {symbol}</caption>
          <thead>
            <tr>
              <th scope="col">Best</th><th scope="col">Market</th><th scope="col">Issuer</th><th scope="col">Token</th><th scope="col">Venue / pair</th>
              <th scope="col" className="num">Reference token price</th><th scope="col" className="num">24h volume</th><th scope="col" className="num">Ask +2% depth<br/><small>CEX orderbook</small></th><th scope="col" className="num">Bid −2% depth<br/><small>CEX orderbook</small></th><th scope="col" className="num">Liquidity<br/><small>CEX score 0–1000 / DEX pool USD</small></th><th scope="col" className="num">Overall<br/><small>0–100</small></th><th scope="col">Rationale</th>
            </tr>
          </thead>
          {METRICS.map(metric => (
          <tbody key={metric.m} className={`svc-best-group ${metric.m}`} data-testid={`group-best-${metric.m}`}>
            {cmp.recommendations.map((rec, index) => {
              const l = { ...metric, kind: rec.kind, pick: rec[metric.m] as VenuePick | null };
              const id = `${l.kind.toLowerCase()}-${l.m}`;
              const v = l.pick ? byKey.get(l.pick.venue.key) : undefined;
              const label = <>
                {index === 0 && <th scope="rowgroup" rowSpan={2} className="svc-best-heading"><span className={`svc-best-tag ${l.m}`}>{l.label}</span></th>}
                <th scope="row"><span className={`demo-kind ${l.kind.toLowerCase()}`}>{l.kind}</span></th>
              </>;
              if (!l.pick || !v) {
                const reason = kindCount(l.kind) === 0 ? `No ${l.kind} demo coverage for any ${symbol} product` : l.none;
                return (
                  <tr key={id} className="na" data-testid={`row-rec-${id}`}>
                    {label}
                    <td colSpan={10} className="svc-none" data-testid={`text-rec-${id}-unavailable`}>Unavailable: {reason}. No pick made.</td>
                  </tr>
                );
              }
              const ref = referencePrice(v), liq = venueLiquidity(v);
              const peers = cmp.rows.filter(r => r.kind === l.kind && (
                l.m === 'price' ? referencePrice(r) !== null :
                l.m === 'liquidity' ? (venueLiquidity(r) ?? 0) > 0 :
                hasCompleteMetrics(r)
              )).length;
              return (
                <tr key={id} data-testid={`row-rec-${id}`}>
                  {label}
                  <td><Link href={`/issuers/${v.issuerId}`} className="text-link" data-testid={`link-rec-issuer-${id}`}>{v.issuerName}</Link></td>
                  <td className="mono" data-testid={`text-rec-${id}-token`}>{v.productSymbol}</td>
                  <td><b>{v.venue}</b>{v.network && <span className="net">{v.network}</span>}<div className="mono svc-dim">{v.pair}</div></td>
                  <td className={`num mono ${l.m === 'price' ? 'hl' : ''}`}>{ref === null ? 'N/A' : tokenPrice(ref)}</td>
                  <td className="num mono">{usd(v.volume24hUsd)}</td>
                  <td className="num mono">{v.kind === 'CEX' ? (v.depthAskUsd === null ? 'N/A' : usd(v.depthAskUsd)) : <span className="svc-dim" title="AMM pool, no orderbook">—</span>}</td>
                  <td className="num mono">{v.kind === 'CEX' ? (v.depthBidUsd === null ? 'N/A' : usd(v.depthBidUsd)) : <span className="svc-dim" title="AMM pool, no orderbook">—</span>}</td>
                  <td className={`num mono ${l.m === 'liquidity' ? 'hl' : ''}`} data-testid={`text-rec-${id}-liquidity`}>{liq === null ? 'N/A' : v.kind === 'CEX' ? <>{liq}/1000<div className="svc-unit">EHC demo score</div></> : <>{usd(liq)}<div className="svc-unit">pool funds</div></>}</td>
                  <td className={`num mono ${l.m === 'overall' ? 'hl' : ''}`} data-testid={`text-rec-${id}-value`}>{l.m === 'overall' ? `${l.pick.value.toFixed(1)}/100` : '—'}</td>
                  <td className="svc-why">{l.reason} across {peers} {l.kind} venue{peers === 1 ? '' : 's'}{peers <= 1 ? ' (single candidate, no real comparison)' : ''}.</td>
                </tr>
              );
            })}
          </tbody>
          ))}
        </table>
      </div>
      <details className="vr-method" data-testid="details-rec-methodology">
        <summary>How picks are ranked</summary>
        <ul>
          <li><b>Scope:</b> all non-wrapped products of this stock across all issuers; no Top 5 cut, no dependence on the selected product or list filter.</li>
          <li><b>Price:</b> lowest displayed reference token price, not an executable ask. Raw per-token quote, not adjusted for issuer share ratios; not comparable as share-equivalent price.</li>
          <li><b>CEX liquidity:</b> highest EHC demo liquidity score, 0–1000 = round(1000 × d / (d + 100,000)), d = min(bid −2%, ask +2% depth). Not CoinMarketCap's proprietary score.</li>
          <li><b>DEX liquidity:</b> highest AMM pool liquidity in USD. Pool funds are not executable ±2% orderbook depth; these AMM demo pools do not provide orderbook depth or quoted spread.</li>
          <li><b>Overall:</b> separate 0–100 scale, 40% lower reference price, 40% higher type-specific liquidity, 20% higher 24h volume, min/max normalized separately within CEX and DEX complete-data peers. CEX and DEX liquidity are never combined or compared. A lone peer scores 100 without a real comparison. Ties break by venue key.</li>
          <li>Excludes fees, gas, slippage and eligibility. Fictional demo data; no live quotes, execution or trading.</li>
        </ul>
      </details>
    </section>
  );
}
