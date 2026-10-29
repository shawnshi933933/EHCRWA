import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, ExternalLink, LockKeyhole, RefreshCw, SearchX } from 'lucide-react';
import type { EquitySource, MarketAccess } from '@workspace/api-client-react';
import { stamp } from '@/lib/format';

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" data-testid="link-brand-home" aria-label="EHC DEX home">
      <img src={`${import.meta.env.BASE_URL}ehc-logo.png`} alt="" aria-hidden="true" className="wm-mark" width="36" height="36" data-testid="img-ehc-logo" />
      <span className="wm-text">EHC <b>DEX</b></span>
      <span className="wm-tag">Equity RWA intelligence</span>
    </Link>
  );
}

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/market-map', label: 'Market Map' },
  { href: '/issuers', label: 'Issuers' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <Wordmark />
        <nav className="top-nav" aria-label="Primary">
          {NAV.map(n => {
            const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
            return <Link key={n.href} href={n.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} data-testid={`link-nav-${n.label.toLowerCase().replace(' ', '-')}`}>{n.label}</Link>;
          })}
        </nav>
        <span className="top-scope" data-testid="text-scope">Stocks only · Research, not execution</span>
      </header>
      <main id="main" className="page-wrap">{children}</main>
      <footer className="site-foot">
        <span>EHC DEX presents tokenized-stock reference data for research. It does not offer trading, custody, or investment advice.</span>
        <span>Data: CoinMarketCap Real-World Assets API, via the EHC server cache.</span>
      </footer>
    </div>
  );
}

export function SourceBar({ source, onRefresh, refreshing, label }: { source: EquitySource; onRefresh: () => void; refreshing: boolean; label?: string }) {
  return (
    <div className={`source-bar ${source.state}`} data-testid="panel-source">
      <div className="sb-main">
        <span className={`sb-state ${source.state}`} data-testid="status-source-state">{source.state === 'stale' ? 'Stale cache' : 'Cached snapshot'}</span>
        <span>{label ?? 'Source'}: <a href={source.url} target="_blank" rel="noreferrer" data-testid="link-source">{source.provider} <ExternalLink aria-hidden="true" /></a></span>
        <span className="mono">Fetched {stamp(source.fetchedAt)}</span>
        <span className="mono">Expires {stamp(source.expiresAt)}</span>
      </div>
      <div className="sb-side">
        <span className="sb-note">Shared server cache: quotes 15 min, metadata 24 h. No auto-refresh.</span>
        <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={refreshing} data-testid="button-check-again">
          <RefreshCw aria-hidden="true" className={refreshing ? 'spin' : ''} /> {refreshing ? 'Checking' : 'Check again'}
        </button>
      </div>
      {source.warnings.length > 0 && (
        <details className="sb-warnings" data-testid="list-source-warnings">
          <summary>{source.warnings.length} source note{source.warnings.length === 1 ? '' : 's'}</summary>
          <ul>{source.warnings.map(w => <li key={w}><AlertTriangle aria-hidden="true" />{w}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

export function MetaWarning({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="inline-warn" role="note" data-testid="text-metadata-warning"><AlertTriangle aria-hidden="true" /><span>{text}</span></div>;
}

export function MarketGap({ access, tokenSourceUrl }: { access: MarketAccess; tokenSourceUrl?: string }) {
  const title = access.status === 'restricted' ? 'Market pairs restricted by data plan' : access.status === 'unavailable' ? 'Market pairs currently unavailable' : 'Market pairs available upstream';
  return (
    <div className={`gap-card ${access.status}`} data-testid="panel-market-gap">
      <div className="gap-head"><LockKeyhole aria-hidden="true" /><strong data-testid="text-market-status">{title}</strong></div>
      <p data-testid="text-market-message">{access.message}</p>
      <p className="gap-strong">No CEX or DEX pair rows are shown. This is a data-access gap, not evidence that zero markets exist.</p>
      <dl className="kv">
        <div><dt>Status</dt><dd className="mono">{access.status}</dd></div>
        <div><dt>Checked</dt><dd className="mono">{stamp(access.checkedAt)}</dd></div>
      </dl>
      <div className="gap-links">
        {tokenSourceUrl && <a href={tokenSourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" data-testid="link-token-cmc">Token markets on CMC <ExternalLink aria-hidden="true" /></a>}
        <a href={access.sourceUrl} target="_blank" rel="noreferrer" className="text-link" data-testid="link-market-source">Market data reference <ExternalLink aria-hidden="true" /></a>
      </div>
    </div>
  );
}

export function StateBox({ kind, title, children, onRetry, action }: { kind: 'error' | 'empty' | 'notfound'; title: string; children?: ReactNode; onRetry?: () => void; action?: ReactNode }) {
  const Icon = kind === 'error' ? AlertTriangle : SearchX;
  return (
    <div className={`state-box ${kind}`} role={kind === 'error' ? 'alert' : 'status'} data-testid={`state-${kind}`}>
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      <div className="state-actions">
        {onRetry && <button type="button" className="btn" onClick={onRetry} data-testid="button-retry"><RefreshCw aria-hidden="true" /> Try again</button>}
        {action}
      </div>
    </div>
  );
}

export function Skel({ h = 16, w = '100%' }: { h?: number; w?: number | string }) {
  return <span className="skel" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function Methodology() {
  return (
    <details className="method" data-testid="panel-methodology">
      <summary data-testid="button-toggle-methodology">Data & methodology <span>Sources, timing, scope, and what each number does and does not mean</span></summary>
      <div className="method-grid">
        <section><h4>Source</h4><p>Stocks, issuers, products and quotes come from the CoinMarketCap Real-World Assets API; contract addresses and token pages come from CMC cryptocurrency info. Company descriptions and company, IR, financial and SEC links for featured stocks (TSLA, AAPL, NVDA) are curated official company resources, not CMC data. Only assets CMC classifies as stocks are included, and source-classified derivatives are excluded; commodities, ETFs, bonds and other categories are excluded by type, not by keyword.</p></section>
        <section><h4>Time and caching</h4><p>The EHC server fetches CMC and stores a shared cache: token quotes for 15 minutes, metadata for 24 hours. Every view shows fetched and expiry times. A stale state means the upstream refresh failed and the last good snapshot is shown. Nothing on this site refreshes automatically.</p></section>
        <section><h4>Scope</h4><p>Totals cover the stocks and products returned by the source, not the entire global tokenized-equity market. The stock directory is built from the fully paginated CMC stock map.</p></section>
        <section><h4>Missing values</h4><p>N/A means the source returned no value. It is never treated as zero. A reported $0 is shown as $0. Sorting always places N/A last.</p></section>
        <section><h4>Wrapped products</h4><p>Products explicitly recognised as wrappers are labelled Wrapped and excluded from issuer market-cap and volume totals. Unrecognised wraps may remain, so de-duplication is best-effort, not guaranteed. A product deployed on several networks is one CMC asset and counted once, not per contract.</p></section>
        <section><h4>Stock cap vs token cap</h4><p>Underlying equity price and equity market cap are not provided by the connected RWA API and show N/A. Tokenized market cap per stock is the CMC-reported aggregate; it may include wrapped products, so it can differ from the sum of issuer totals.</p></section>
        <section><h4>Volume is not depth</h4><p>24h volume is reported traded value. It says nothing about order-book depth, spread, or the cost of a given trade size. Issuer rankings sort by market cap or 24h volume only, never by a liquidity score.</p></section>
        <section><h4>Market pairs</h4><p>CEX and DEX market-pair endpoints are restricted on the current data plan. Markets & Liquidity shows that gap explicitly and links to CMC rather than inventing venues.</p></section>
        <section><h4>Not interchangeable</h4><p>Products referencing the same stock differ in legal wrapper, issuer, rights and redemption. A shared ticker is a discovery aid only.</p></section>
      </div>
    </details>
  );
}
