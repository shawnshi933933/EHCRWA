import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { buildDemoMarkets, filterDemoMarkets, summarizeDemoMarkets, type DemoFilter, type DemoMarketInput } from '@/data/demo-markets';
import { tokenPrice, usd } from '@/lib/format';
import { VenueRecommendations } from '@/components/venue-recommendations';

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
        <div><i>Example ±2% depth</i><b className="mono">{usd(sum.depthTotalUsd)}</b></div>
        <div><i>Median spread</i><b className="mono">{sum.medianSpreadBps === null ? 'N/A' : `${sum.medianSpreadBps.toFixed(1)} bps`}</b></div>
      </div>

      <VenueRecommendations rows={set.rows} symbol={product.symbol} />

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
                <div><dt>Spread</dt><dd className="mono">{m.spreadBps.toFixed(1)} bps</dd></div>
                <div><dt>Bid −2%</dt><dd className="mono">{usd(m.depthBidUsd)}</dd></div>
                <div><dt>Ask +2%</dt><dd className="mono">{usd(m.depthAskUsd)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="fine">
        Illustrative snapshot, not live and not timestamped. Depth is simulated resting order value within ±2% of mid, shown separately from volume.
        {set.basePriceUsd === null ? ' The token price is unavailable, so example prices show N/A.' : ' Example prices are offset from the displayed token price for illustration only.'}
        {' '}These figures are excluded from every real issuer and stock total. No trading, wallets, or venue links.
      </p>
    </section>
  );
}
