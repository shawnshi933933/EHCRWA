import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileText, Globe, Landmark, Search } from 'lucide-react';
import {
  getGetEquityDetailQueryKey,
  useGetEquityDetail,
  useGetEquityUniverse,
  type EquityDetail,
  type EquityIssuer,
  type EquityProduct,
  type EquityUniverse,
} from '@workspace/api-client-react';
import { DemoMarkets } from '@/components/demo-markets';
import { MarketGap, MetaWarning, Methodology, Skel, SourceBar, StateBox } from '@/components/shell';
import { byNullLast, count, errorStatus, errorText, NA, parseNumericId, shortAddr, stamp, tokenPrice, usd, usePageMeta } from '@/lib/format';

const DEFAULT_STOCK = 14;
const PAGE = 12;

function buildHref(stock: number, issuer?: string | null, token?: number | null) {
  const p = new URLSearchParams({ stock: String(stock) });
  if (issuer) p.set('issuer', issuer);
  if (token) p.set('token', String(token));
  return `/market-map?${p.toString()}`;
}

export default function MarketMap() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const rawStock = params.get('stock');
  const rawIssuer = params.get('issuer');
  const rawToken = params.get('token');
  const stockId = rawStock === null ? DEFAULT_STOCK : parseNumericId(rawStock);
  const tokenParam = rawToken === null ? null : parseNumericId(rawToken);
  const tokenInvalid = rawToken !== null && tokenParam === null;

  const uni = useGetEquityUniverse();
  const detail = useGetEquityDetail(stockId ?? 0, { query: { enabled: stockId !== null, queryKey: getGetEquityDetailQueryKey(stockId ?? 0) } });

  const d = detail.data;
  usePageMeta(
    d ? `${d.stock.symbol} tokenized products — Market Map · EHC DEX` : 'Market Map · EHC DEX',
    d ? `How ${d.stock.name} is tokenized: ${d.stock.productCount} products across ${d.stock.issuerCount} issuers, with networks, contracts and market-data availability.` : 'Trace a stock to its issuer products and market-data availability.',
  );

  const issuerNames = useMemo(() => {
    const m = new Map<string, EquityIssuer>();
    uni.data?.issuers.forEach(i => m.set(i.id, i));
    return m;
  }, [uni.data]);

  return (
    <div className="map-page">
      <header className="page-head rise">
        <div>
          <div className="eyebrow">Market Map · stock view</div>
          <h1>Stock → Issuers → Markets</h1>
          <p>Choose a stock, then a product. Branch lines show which products reference which stock; they do not represent quantities or flows.</p>
        </div>
      </header>

      <StockDirectory universe={uni} currentId={stockId} onPick={id => navigate(buildHref(id))} />

      {stockId === null ? (
        <StateBox kind="notfound" title="That stock ID is not valid" action={<Link href={buildHref(DEFAULT_STOCK)} className="btn" data-testid="link-default-stock">Open Tesla (TSLA)</Link>}>
          The stock parameter "{rawStock}" is not a numeric RWA ID. Pick a stock from the directory above.
        </StateBox>
      ) : detail.isLoading ? <MapSkeleton /> : detail.isError && !d ? (
        errorStatus(detail.error) === 404 ? (
          <StateBox kind="notfound" title={`No tokenized stock with ID ${stockId}`} action={<Link href={buildHref(DEFAULT_STOCK)} className="btn" data-testid="link-default-stock">Open Tesla (TSLA)</Link>}>
            The source has no stock-type RWA with this ID. We do not substitute another stock.
          </StateBox>
        ) : (
          <StateBox kind="error" title="Could not load this stock" onRetry={() => detail.refetch()}>{errorText(detail.error)}</StateBox>
        )
      ) : d ? (
        <>
          <SourceBar source={d.source} refreshing={detail.isFetching} updateFailed={detail.isError} />
          <MetaWarning text={d.metadataWarning} />
          <MapBoard
            detail={d}
            issuerNames={issuerNames}
            issuerParam={rawIssuer}
            tokenParam={tokenParam}
            tokenInvalid={tokenInvalid}
            onSelect={(issuer, token) => navigate(buildHref(d.stock.id, issuer, token))}
          />
        </>
      ) : null}
      <Methodology />
    </div>
  );
}

/* ---------- Directory ---------- */

function StockDirectory({ universe, currentId, onPick }: { universe: { data?: EquityUniverse; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }; currentId: number | null; onPick: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(true);
  const stocks = universe.data?.stocks;
  const filtered = useMemo(() => {
    if (!stocks) return [];
    const t = q.trim().toLowerCase();
    const list = t ? stocks.filter(s => s.symbol.toLowerCase().includes(t) || s.name.toLowerCase().includes(t)) : stocks;
    return [...list].sort(byNullLast(s => s.tokenizedMarketCapUsd));
  }, [stocks, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const current = stocks?.find(s => s.id === currentId);

  return (
    <section className="directory" aria-labelledby="dir-title">
      <div className="dir-bar">
        <div className="dir-current">
          <span className="eyebrow" id="dir-title">Stock directory</span>
          <span className="dir-cov" data-testid="text-directory-coverage">
            {universe.data ? <>{count(universe.data.source.tokenizedStockCount)} tokenized stocks · {count(universe.data.source.catalogStockCount)} stock profiles covered</> : universe.isLoading ? 'Loading coverage' : 'Directory unavailable'}
          </span>
        </div>
        <label className="search-field" htmlFor="stock-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search stocks by ticker or company name</span>
          <input id="stock-search" type="search" value={q} placeholder={current ? `${current.symbol} · search ticker or company` : 'Search ticker or company'} autoComplete="off"
            onChange={e => { setQ(e.target.value); setPage(0); setOpen(true); }} onFocus={() => setOpen(true)} data-testid="input-stock-search" aria-controls="dir-list" />
        </label>
        <button type="button" className="btn btn-ghost" aria-expanded={open} aria-controls="dir-list" onClick={() => setOpen(o => !o)} data-testid="button-toggle-directory">
          {open ? 'Hide directory' : 'Browse all'} <ChevronDown aria-hidden="true" className={open ? 'flip' : ''} />
        </button>
      </div>
      {open && (
        <div id="dir-list" className="dir-panel">
          {universe.isLoading ? <div className="dir-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="dir-item"><Skel w="40%" /><Skel h={11} w="70%" /></div>)}</div>
            : universe.isError && !universe.data ? <StateBox kind="error" title="Directory could not load" onRetry={() => universe.refetch()}>{errorText(universe.error)}</StateBox>
            : filtered.length === 0 ? <StateBox kind="empty" title="No stock matches that search">Only stocks with at least one tokenized product in the source are listed. Try a ticker such as AAPL or a company name.</StateBox>
            : (
              <>
                <ul className="dir-grid" aria-label="Stocks, sorted by tokenized market cap, N/A last">
                  {rows.map(s => (
                    <li key={s.id}>
                      <button type="button" className={`dir-item ${s.id === currentId ? 'on' : ''}`} aria-pressed={s.id === currentId} onClick={() => { onPick(s.id); setQ(''); }} data-testid={`button-stock-${s.id}`}>
                        <span className="di-top"><b className="mono">{s.symbol}</b><em className="mono">{usd(s.tokenizedMarketCapUsd)}</em></span>
                        <span className="di-name">{s.name}</span>
                        <span className="di-meta">{s.productCount} products · {s.issuerCount} issuers</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="pager">
                  <span className="mono" data-testid="text-directory-range">{safePage * PAGE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE)} of {count(filtered.length)}</span>
                  <div>
                    <button type="button" className="icon-btn" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} aria-label="Previous page" data-testid="button-dir-prev"><ChevronLeft aria-hidden="true" /></button>
                    <button type="button" className="icon-btn" onClick={() => setPage(safePage + 1)} disabled={safePage >= pages - 1} aria-label="Next page" data-testid="button-dir-next"><ChevronRight aria-hidden="true" /></button>
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </section>
  );
}

/* ---------- Board ---------- */

type Group = { issuerId: string; name: string; products: EquityProduct[]; capSum: number | null; capHasNull: boolean };

function MapBoard({ detail, issuerNames, issuerParam, tokenParam, tokenInvalid, onSelect }: {
  detail: EquityDetail; issuerNames: Map<string, EquityIssuer>; issuerParam: string | null; tokenParam: number | null; tokenInvalid: boolean;
  onSelect: (issuer: string, token: number) => void;
}) {
  const { stock, profile, products } = detail;
  const groups = useMemo<Group[]>(() => {
    const m = new Map<string, EquityProduct[]>();
    products.forEach(p => m.set(p.issuerId, [...(m.get(p.issuerId) ?? []), p]));
    return [...m.entries()].map(([issuerId, list]) => {
      const sorted = [...list].sort(byNullLast(p => p.marketCapUsd));
      const counted = sorted.filter(p => !p.isWrapped);
      const caps = counted.map(p => p.marketCapUsd).filter((v): v is number => v !== null);
      return { issuerId, name: issuerNames.get(issuerId)?.name ?? issuerId, products: sorted, capSum: caps.length ? caps.reduce((a, b) => a + b, 0) : null, capHasNull: counted.some(p => p.marketCapUsd === null) };
    }).sort(byNullLast(g => g.capSum));
  }, [products, issuerNames]);

  const issuerMissing = issuerParam !== null && !groups.some(g => g.issuerId === issuerParam);
  const tokenProduct = tokenParam !== null ? products.find(p => p.id === tokenParam) ?? null : null;
  const tokenMissing = tokenInvalid || (tokenParam !== null && !tokenProduct) || (tokenProduct !== null && issuerParam !== null && tokenProduct.issuerId !== issuerParam);
  const badParam = issuerMissing || tokenMissing;

  let selected: EquityProduct | null = null;
  if (!badParam) {
    if (tokenProduct) selected = tokenProduct;
    else if (issuerParam) selected = groups.find(g => g.issuerId === issuerParam)?.products[0] ?? null;
    else selected = groups[0]?.products[0] ?? null;
  }
  const selIssuer = selected?.issuerId ?? null;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // connector geometry
  const boardRef = useRef<HTMLDivElement>(null);
  const stockRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLElement>());
  const selRef = useRef<HTMLButtonElement | null>(null);
  const [paths, setPaths] = useState<{ id: string; d: string; on: boolean }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const board = boardRef.current;
    const s = stockRef.current;
    if (!board || !s || window.matchMedia('(max-width: 1099px)').matches) { setPaths([]); return; }
    const b = board.getBoundingClientRect();
    const sr = s.getBoundingClientRect();
    const x1 = sr.right - b.left;
    const y1 = Math.min(sr.top - b.top + 80, sr.bottom - b.top - 20);
    const out: { id: string; d: string; on: boolean }[] = [];
    groupRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const x2 = r.left - b.left;
      const y2 = r.top - b.top + 30;
      const mx = (x1 + x2) / 2;
      out.push({ id, d: `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`, on: id === selIssuer });
    });
    const sel = selRef.current;
    const m = marketRef.current;
    if (sel && m) {
      const r = sel.getBoundingClientRect();
      const mr = m.getBoundingClientRect();
      const x3 = r.right - b.left;
      const y3 = r.top - b.top + r.height / 2;
      const x4 = mr.left - b.left;
      const y4 = mr.top - b.top + 46;
      const mx = (x3 + x4) / 2;
      out.push({ id: '__sel', d: `M${x3} ${y3} C${mx} ${y3} ${mx} ${y4} ${x4} ${y4}`, on: true });
    }
    setSize({ w: b.width, h: b.height });
    setPaths(out);
  }, [selIssuer]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure, expanded, selected?.id, groups]);

  return (
    <>
      {badParam && (
        <StateBox kind="notfound" title="That product is not part of this stock" action={<button type="button" className="btn" onClick={() => groups[0] && onSelect(groups[0].issuerId, groups[0].products[0].id)} data-testid="button-clear-selection">Show the largest product instead</button>}>
          {issuerMissing ? `Issuer "${issuerParam}" has no product for ${stock.symbol}. ` : ''}{tokenMissing ? `Token ID "${tokenInvalid ? 'invalid' : tokenParam}" is not a ${stock.symbol} product${issuerParam && !issuerMissing ? ' from this issuer' : ''}. ` : ''}Nothing was selected automatically.
        </StateBox>
      )}
      <div className="board" ref={boardRef} data-testid="board-relationship-map">
        <svg className="connectors" width={size.w} height={size.h} aria-hidden="true">
          {paths.map(p => <path key={p.id} d={p.d} className={p.on ? 'on' : ''} />)}
        </svg>

        {/* LEFT: stock */}
        <section className="col col-stock" aria-labelledby="col1">
          <div className="col-label"><span className="mono">01</span><h2 id="col1">Stock overview</h2></div>
          <div className="stock-card" ref={stockRef} data-testid="card-stock">
            <div className="sc-head">
              <span className="ticker mono" data-testid="text-stock-symbol">{stock.symbol}</span>
              <div><h3 data-testid="text-stock-name">{stock.name}</h3><p>{[profile.exchange, profile.industry].filter(Boolean).join(' · ') || 'Exchange and industry not provided'}</p></div>
            </div>
            {profile.description && <p className="sc-desc">{profile.description}</p>}
            <div className="metric-grid">
              <Metric label="Stock price" value={usd(profile.stockPriceUsd, false)} na={profile.stockPriceUsd === null} id="stock-price" />
              <Metric label="Equity market cap" value={usd(profile.equityMarketCapUsd)} na={profile.equityMarketCapUsd === null} id="equity-cap" />
            </div>
            {(profile.stockPriceUsd === null || profile.equityMarketCapUsd === null) && <p className="fine">Underlying stock price and equity market cap are currently unavailable. Token prices may differ from share prices because issuer ratios vary.</p>}
            <div className="rwa-totals">
              <span className="eyebrow">Tokenized RWA totals</span>
              <div className="metric-grid">
                <Metric label="Tokenized market cap" value={usd(stock.tokenizedMarketCapUsd)} na={stock.tokenizedMarketCapUsd === null} id="tokenized-cap" big />
                <Metric label="Tokenized 24h volume" value={usd(stock.tokenizedVolume24hUsd)} na={stock.tokenizedVolume24hUsd === null} id="tokenized-vol" />
                <Metric label="Products" value={String(stock.productCount)} id="product-count" />
                <Metric label="Issuers" value={String(stock.issuerCount)} id="issuer-count" />
              </div>
              <p className="fine">As of {stamp(stock.asOf)}. Aggregate may include wrapped products, so it can differ from issuer sums.</p>
            </div>
            <div className="link-list">
              <ExtLink href={profile.website} icon={Globe} label="Company website" id="website" />
              <ExtLink href={profile.investorRelationsUrl} icon={Landmark} label="Investor relations" id="ir" />
              <ExtLink href={profile.financialsUrl} icon={FileText} label="Financial statements" id="financials" />
              <ExtLink href={profile.secUrl} icon={FileText} label="SEC filings" id="sec" />
            </div>
          </div>
        </section>

        {/* CENTER: issuers */}
        <section className="col col-issuers" aria-labelledby="col2">
          <div className="col-label"><span className="mono">02</span><h2 id="col2">Issuers & tokens</h2><span className="col-count mono">{groups.length} issuers · {products.length} products</span></div>
          {groups.length === 0 ? <StateBox kind="empty" title="No eligible token products">No eligible stock-token products are available for this stock. Derivatives are excluded and no alternative stock is substituted.</StateBox> : (
            <div className="groups">
              {groups.map(g => {
                const isOpen = expanded[g.issuerId] || g.products.slice(1).some(p => p.id === selected?.id);
                const shown = isOpen ? g.products : g.products.slice(0, 1);
                return (
                  <article key={g.issuerId} className={`group ${g.issuerId === selIssuer ? 'active' : ''}`} ref={el => { if (el) groupRefs.current.set(g.issuerId, el); else groupRefs.current.delete(g.issuerId); }} data-testid={`card-issuer-${g.issuerId}`}>
                    <header className="g-head">
                      <Link href={`/issuers/${g.issuerId}`} className="g-name" data-testid={`link-issuer-${g.issuerId}`}>{g.name} <ChevronRight aria-hidden="true" /></Link>
                      <span className="g-sum mono" title="Sum of non-wrapped product market caps for this stock">{usd(g.capSum)}{g.capHasNull && g.capSum !== null ? ' +' : ''}</span>
                    </header>
                    <ul className="products">
                      {shown.map(p => (
                        <li key={p.id}>
                          <button type="button" ref={p.id === selected?.id ? selRef : undefined} className={`product ${p.id === selected?.id ? 'sel' : ''}`} aria-pressed={p.id === selected?.id} onClick={() => onSelect(p.issuerId, p.id)} data-testid={`button-product-${p.id}`}>
                            <span className="p-id"><b className="mono">{p.symbol}</b>{p.isWrapped && <span className="tag wrap">Wrapped</span>}<span className="p-name">{p.name}</span></span>
                            <span className="p-nums">
                              <span><i>Price</i><b className="mono">{tokenPrice(p.priceUsd)}</b></span>
                              <span><i>Mkt cap</i><b className="mono">{usd(p.marketCapUsd)}</b></span>
                              <span><i>24h vol</i><b className="mono">{usd(p.volume24hUsd)}</b></span>
                            </span>
                            <span className="p-nets">{p.networks.length ? p.networks.map(n => <span key={n} className="net">{n}</span>) : <span className="net muted">Networks N/A</span>}<span className="muted mono">{p.contracts.length} contract{p.contracts.length === 1 ? '' : 's'}</span></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {g.products.length > 1 && !g.products.slice(1).some(p => p.id === selected?.id) && (
                      <button type="button" className="g-more" aria-expanded={!!expanded[g.issuerId]} onClick={() => setExpanded(e => ({ ...e, [g.issuerId]: !e[g.issuerId] }))} data-testid={`button-expand-${g.issuerId}`}>
                        {expanded[g.issuerId] ? 'Show fewer versions' : `Show ${g.products.length - 1} more version${g.products.length > 2 ? 's' : ''}`} <ChevronDown aria-hidden="true" className={expanded[g.issuerId] ? 'flip' : ''} />
                      </button>
                    )}
                  </article>
                );
              })}
              <p className="fine">Issuer sums exclude wrapped products. "+" means some products have no market cap, so the sum is partial. Different issuers' tokens are not interchangeable.</p>
            </div>
          )}
        </section>

        {/* RIGHT: markets */}
        <section className="col col-markets" aria-labelledby="col3" aria-live="polite">
          <div className="col-label"><span className="mono">03</span><h2 id="col3">Markets & liquidity</h2></div>
          <div className="market-card" ref={marketRef} data-testid="panel-selected-product">
            {selected ? <SelectedProduct p={selected} issuerName={groups.find(g => g.issuerId === selected!.issuerId)?.name ?? selected.issuerId} />
              : <p className="muted pad">Select a product in column 02 to see its contracts and market-data status.</p>}
            {selected && <DemoMarkets key={selected.id} product={selected} />}
            <details className="gap-fold" open={!selected} data-testid="panel-market-gap-fold">
              <summary>Live market coverage <span>Detailed venue information is not available yet</span></summary>
              <MarketGap access={detail.marketAccess} tokenSourceUrl={selected?.sourceUrl} />
            </details>
          </div>
        </section>
      </div>
    </>
  );
}

function SelectedProduct({ p, issuerName }: { p: EquityProduct; issuerName: string }) {
  return (
    <div className="sel-prod" key={p.id}>
      <span className="eyebrow">Selected product</span>
      <h3 data-testid="text-selected-product"><span className="mono">{p.symbol}</span> {p.name}</h3>
      <p className="muted">{issuerName}{p.isWrapped ? ' · Wrapped version' : ''} · Product ID <span className="mono">{p.id}</span></p>
      <div className="metric-grid">
        <Metric label="Token price" value={tokenPrice(p.priceUsd)} na={p.priceUsd === null} id="sel-price" />
        <Metric label="Market cap" value={usd(p.marketCapUsd)} na={p.marketCapUsd === null} id="sel-cap" />
        <Metric label="24h volume" value={usd(p.volume24hUsd)} na={p.volume24hUsd === null} id="sel-vol" />
        <Metric label="Quote as of" value={p.asOf ? stamp(p.asOf) : NA} na={!p.asOf} id="sel-asof" small />
      </div>
      <p className="fine">24h volume is traded value, not depth. No price-change figure is provided by the source.</p>
      <div className="contracts">
        <span className="eyebrow">Contracts · one asset across {p.networks.length || 0} network{p.networks.length === 1 ? '' : 's'}</span>
        {p.contracts.length === 0 ? <p className="muted">No contract addresses returned.</p> : (
          <ul>
            {p.contracts.map(c => (
              <li key={`${c.network}-${c.address}`} data-testid={`row-contract-${c.address}`}>
                <span className="net">{c.network}</span>
                <code title={c.address}>{shortAddr(c.address)}</code>
                {c.explorerUrl ? <a href={c.explorerUrl} target="_blank" rel="noreferrer" aria-label={`View ${c.network} contract in explorer`}><ExternalLink aria-hidden="true" /></a> : <span className="muted">no explorer</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {p.website && <a className="text-link" href={p.website} target="_blank" rel="noreferrer" data-testid="link-product-website">Issuer product page <ExternalLink aria-hidden="true" /></a>}
    </div>
  );
}

function Metric({ label, value, na, id, big, small }: { label: string; value: string; na?: boolean; id: string; big?: boolean; small?: boolean }) {
  return (
    <div className={`metric ${big ? 'big' : ''} ${small ? 'small' : ''}`}>
      <span>{label}</span>
      <b className={`mono ${na ? 'na' : ''}`} data-testid={`text-${id}`}>{value}</b>
    </div>
  );
}

function ExtLink({ href, icon: Icon, label, id }: { href: string | null; icon: typeof Globe; label: string; id: string }) {
  if (!href) return <span className="ext off" data-testid={`text-link-missing-${id}`}><Icon aria-hidden="true" />{label}<em>not provided</em></span>;
  return <a className="ext" href={href} target="_blank" rel="noreferrer" data-testid={`link-${id}`}><Icon aria-hidden="true" />{label}<ExternalLink aria-hidden="true" className="ext-arrow" /></a>;
}

function MapSkeleton() {
  return (
    <div className="board skeleton-board" aria-busy="true" aria-label="Loading relationship map">
      {[0, 1, 2].map(c => (
        <div key={c} className="col">
          <Skel h={14} w="40%" />
          {Array.from({ length: c === 1 ? 4 : 2 }, (_, i) => <div key={i} className="skel-card"><Skel h={18} w="55%" /><Skel h={12} /><Skel h={12} w="80%" /></div>)}
        </div>
      ))}
    </div>
  );
}

