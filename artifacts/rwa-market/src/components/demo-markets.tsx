import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { buildDemoMarkets, filterDemoMarkets, summarizeDemoMarkets, type DemoFilter, type DemoMarketInput } from '@/data/demo-markets';
import { tokenPrice, usd } from '@/lib/format';

const FILTERS: { v: DemoFilter; label: string }[] = [{ v: 'all', label: 'All' }, { v: 'CEX', label: 'CEX' }, { v: 'DEX', label: 'DEX' }];

export function DemoMarkets({ product }: { product: DemoMarketInput }) {
  const [filter, setFilter] = useState<DemoFilter>('all');
  const set = useMemo(() => buildDemoMarkets(product), [product]);
  const rows = useMemo(() => filterDemoMarkets(set.rows, filter), [set, filter]);
  const sum = useMemo(() => summarizeDemoMarkets(rows), [rows]);

  return (
    <section className="demo-mk" aria-labelledby="demo-mk-title" data-testid="panel-demo-markets">
      <div className="demo-banner" role="note" data-testid="text-demo-label">
        <FlaskConical aria-hidden="true" />
        <span><b>Demo data · Illustrative only</b> Fictional venues and numbers for a visual preview. Not live market data or actual listings.</span>
      </div>
      <div className="demo-head">
        <h4 id="demo-mk-title">Example venues for <span className="mono">{product.symbol}</span></h4>
        <div className="seg" role="group" aria-label="Filter demo venues by type">
          {FILTERS.map(f => (
            <button key={f.v} type="button" aria-pressed={filter === f.v} onClick={() => setFilter(f.v)} data-testid={`button-demo-filter-${f.v.toLowerCase()}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="demo-sum" data-testid="panel-demo-summary">
        <span className="demo-pill">Demo</span>
        <div><i>Venues</i><b className="mono">{sum.venueCount}</b><em>{sum.cexCount} CEX · {sum.dexCount} DEX</em></div>
        <div><i>Example 24h vol</i><b className="mono">{usd(sum.volume24hUsd)}</b></div>
        {filter !== 'DEX' && <>
          <div data-testid="text-demo-cex-depth"><i>CEX orderbook depth</i><b className="mono">{sum.cexBidDepthUsd === null ? 'N/A' : usd(sum.cexBidDepthUsd)} <small>bid −2%</small></b><b className="mono">{sum.cexAskDepthUsd === null ? 'N/A' : usd(sum.cexAskDepthUsd)} <small>ask +2%</small></b></div>
          <div data-testid="text-demo-cex-score"><i>Median CEX liquidity score</i><b className="mono">{sum.medianCexLiquidityScore === null ? 'N/A' : `${Math.round(sum.medianCexLiquidityScore)} / 1000`}</b><em>EHC illustrative score</em></div>
        </>}
        {filter !== 'CEX' && <div data-testid="text-demo-dex-pool"><i>DEX pool liquidity (USD)</i><b className="mono">{sum.dexPoolLiquidityUsd === null ? 'N/A' : usd(sum.dexPoolLiquidityUsd)}</b><em>Pool funds, not ±2% depth</em></div>}
      </div>

      {rows.length === 0 ? (
        <p className="muted demo-empty" data-testid="text-demo-empty">
          {filter === 'DEX' ? 'No example DEX venues: this product has no contract network to place a demo pool on.' : 'No example venues for this filter.'}
        </p>
      ) : (
        <ul className="demo-list" aria-label="Illustrative example venues">
          {rows.map(m => (
            <li key={m.key} className="demo-row" data-testid={`row-demo-${m.key}`}>
              <div className="dr-top">
                <b>{m.venue}</b>
                <span className={`demo-kind ${m.kind.toLowerCase()}`}>{m.kind}</span>
                {m.network && <span className="net">{m.network}</span>}
                <span className="mono dr-pair">{m.pair}</span>
              </div>
              <dl className="dr-nums">
                <div><dt>Price</dt><dd className={`mono ${m.priceUsd === null ? 'na' : ''}`}>{tokenPrice(m.priceUsd)}</dd></div>
                <div><dt>24h vol</dt><dd className="mono">{usd(m.volume24hUsd)}</dd></div>
                {m.kind === 'CEX' ? <>
                  <div><dt>Liq. score</dt><dd className="mono">{m.liquidityScore === null ? 'N/A' : `${m.liquidityScore}/1000`}</dd></div>
                  <div><dt>Ask +2% depth</dt><dd className="mono">{m.depthAskUsd === null ? 'N/A' : usd(m.depthAskUsd)}</dd></div>
                  <div><dt>Bid −2% depth</dt><dd className="mono">{m.depthBidUsd === null ? 'N/A' : usd(m.depthBidUsd)}</dd></div>
                </> : <>
                  <div><dt>Pool liquidity</dt><dd className="mono">{m.poolLiquidityUsd === null ? 'N/A' : usd(m.poolLiquidityUsd)}</dd></div>
                </>}
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="fine">
        Illustrative snapshot, not live and not timestamped. CEX depth is simulated resting order value, bid within −2% and ask within +2% of mid, shown as two separate values. CEX liquidity score (0–1000) is an EHC demo formula, round(1000 × d / (d + 100,000)) with d = min(bid, ask depth); it is not CoinMarketCap's methodology. DEX pool liquidity is total funds in the AMM pool, not executable depth: price impact grows with trade size. CEX and DEX liquidity are never added together.
        {set.basePriceUsd === null ? ' The token price is unavailable, so example prices show N/A.' : ' Example prices are offset from the displayed token price for illustration only.'}
        {' '}These figures are excluded from every real issuer and stock total. No trading, wallets, or venue links.
      </p>
    </section>
  );
}
