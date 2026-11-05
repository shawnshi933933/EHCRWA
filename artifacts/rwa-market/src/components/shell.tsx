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
      </header>
      <main id="main" className="page-wrap">{children}</main>
      <footer className="site-foot">
        <span>EHC DEX connects tokenized equity markets. Phase one brings together asset, issuer, and liquidity information, with trading capabilities planned for future phases.</span>
        <span>Labeled demo venues on the Market Map are illustrative only.</span>
      </footer>
    </div>
  );
}

export function SourceBar({ source, refreshing, updateFailed = false }: { source: EquitySource; refreshing: boolean; updateFailed?: boolean }) {
  const delayed = source.state === 'stale' || updateFailed;
  return (
    <div className={`source-bar ${delayed ? 'stale' : ''}`} aria-busy={refreshing} data-testid="panel-source">
      <div className="sb-main">
        <span className="mono" data-testid="text-last-updated">Updated {stamp(source.fetchedAt)}</span>
        {delayed && <span className="sb-state stale" data-testid="status-source-state" role="status">Updates delayed</span>}
      </div>
      {delayed && <span role="note">Showing the last available data. Updates will retry automatically.</span>}
    </div>
  );
}

export function MetaWarning({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="inline-warn" role="note" data-testid="text-metadata-warning"><AlertTriangle aria-hidden="true" /><span>{text}</span></div>;
}

export function MarketGap({ access, tokenSourceUrl }: { access: MarketAccess; tokenSourceUrl?: string }) {
  const title = 'Live market details unavailable';
  return (
    <div className={`gap-card ${access.status}`} data-testid="panel-market-gap">
      <div className="gap-head"><LockKeyhole aria-hidden="true" /><strong data-testid="text-market-status">{title}</strong></div>
      <p data-testid="text-market-message">Detailed live venue coverage is not available yet. Any labeled demo venues are illustrative, not actual market listings.</p>
      <p className="gap-strong">Missing market details do not mean that no CEX or DEX markets exist.</p>
      <dl className="kv">
        <div><dt>Checked</dt><dd className="mono">{stamp(access.checkedAt)}</dd></div>
      </dl>
      <div className="gap-links">
        {tokenSourceUrl && <a href={tokenSourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" data-testid="link-token-cmc">Explore token markets <ExternalLink aria-hidden="true" /></a>}
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
        <section><h4>Data coverage</h4><p>Market metrics, issuer profiles and contract details use third-party market information. Featured company descriptions and financial disclosures link to official company resources. Only classified stock products are included; derivatives and other asset categories are excluded. <a href="https://coinmarketcap.com/real-world-assets/" target="_blank" rel="noreferrer">Market data reference</a></p></section>
        <section><h4>Automatic updates</h4><p>Market information refreshes automatically while you browse and when you return to the page. The update time reflects the latest available snapshot, not a live price feed. If updates are delayed, the last available data remains visible and updates retry automatically.</p></section>
        <section><h4>Scope</h4><p>Totals cover the stocks and products in our research directory, not the entire global tokenized-equity market.</p></section>
        <section><h4>Missing values</h4><p>N/A means the source returned no value. It is never treated as zero. A reported $0 is shown as $0. Sorting always places N/A last.</p></section>
        <section><h4>Wrapped products</h4><p>Products explicitly recognised as wrappers are labelled Wrapped and excluded from issuer market-cap and volume totals. Unrecognised wraps may remain, so de-duplication is best-effort, not guaranteed. A product deployed on several networks is counted once, not per contract.</p></section>
        <section><h4>Stock cap vs token cap</h4><p>Unavailable underlying stock prices and equity market caps show N/A. Tokenized market cap per stock is a reported aggregate; it may include wrapped products, so it can differ from the sum of issuer totals.</p></section>
        <section><h4>Volume is not depth</h4><p>24h volume is reported traded value. It says nothing about order-book depth, spread, or the cost of a given trade size. Issuer rankings sort by market cap or 24h volume only, never by a liquidity score.</p></section>
        <section><h4>Market pairs</h4><p>Live venue details are not available yet. On the Market Map only, column 03 includes clearly labeled demo venues for a visual preview. They are fictional, not live, not actual listings, and excluded from all real stock and issuer totals. Issuer pages show actual coverage only, with no demo metrics.</p></section>
        <section><h4>Not interchangeable</h4><p>Products referencing the same stock differ in legal wrapper, issuer, rights and redemption. A shared ticker is a discovery aid only.</p></section>
      </div>
    </details>
  );
}
