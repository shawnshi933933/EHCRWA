import { useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { getGetEquityIssuerQueryKey, useGetEquityIssuer, type EquityProduct } from '@workspace/api-client-react';
import { MarketGap, MetaWarning, Methodology, Skel, SourceBar, StateBox } from '@/components/shell';
import { byNullLast, count, errorStatus, errorText, tokenPrice, usd, usePageMeta } from '@/lib/format';

type SortKey = 'cap' | 'volume' | 'price';
const SORT_LABEL: Record<SortKey, string> = { cap: 'Market cap', volume: '24h volume', price: 'Token price' };

export default function IssuerDetail() {
  const params = useParams<{ issuerId: string }>();
  const issuerId = (params.issuerId ?? '').trim();
  const valid = /^[a-f0-9]{24}$/.test(issuerId);
  const q = useGetEquityIssuer(issuerId, { query: { enabled: valid, queryKey: getGetEquityIssuerQueryKey(issuerId) } });
  const d = q.data;
  usePageMeta(
    d ? `${d.issuer.name} tokenized stocks · EHC DEX` : 'Issuer · EHC DEX',
    d ? `${d.issuer.name}: ${d.issuer.productCount} tokenized stock products across ${d.issuer.stockCount} stocks, ranked by market cap or 24h volume.` : 'Issuer research for tokenized stock products.',
  );

  const [search, setSearch] = useState('');
  const [net, setNet] = useState('all');
  const [sort, setSort] = useState<SortKey>('cap');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const stockMap = useMemo(() => new Map((d?.stocks ?? []).map(s => [s.id, s])), [d]);
  const networks = useMemo(() => [...new Set((d?.products ?? []).flatMap(p => p.networks))].sort(), [d]);
  const rows = useMemo(() => {
    if (!d) return [];
    const t = search.trim().toLowerCase();
    const get: (p: EquityProduct) => number | null = sort === 'cap' ? p => p.marketCapUsd : sort === 'volume' ? p => p.volume24hUsd : p => p.priceUsd;
    return d.products
      .filter(p => net === 'all' || p.networks.includes(net))
      .filter(p => {
        if (!t) return true;
        const s = stockMap.get(p.stockId);
        return [p.symbol, p.name, s?.symbol, s?.name].some(v => v?.toLowerCase().includes(t));
      })
      .sort(byNullLast(get));
  }, [d, search, net, sort, stockMap]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const missingVolume = d?.products.filter(p => !p.isWrapped && p.volume24hUsd === null).length ?? 0;

  const back = <Link href="/issuers" className="btn" data-testid="link-back-issuers"><ArrowLeft aria-hidden="true" /> All issuers</Link>;

  if (!valid) return <div className="issuer-page"><StateBox kind="notfound" title="Issuer not found" action={back}>"{issuerId}" is not a valid issuer ID.</StateBox></div>;

  return (
    <div className="issuer-page">
      <Link href="/issuers" className="crumb" data-testid="link-crumb-issuers"><ArrowLeft aria-hidden="true" /> Issuers</Link>
      {q.isLoading ? (
        <div className="page-head"><div><Skel h={14} w={120} /><Skel h={40} w={320} /><Skel h={12} w={420} /></div></div>
      ) : q.isError ? (
        errorStatus(q.error) === 404
          ? <StateBox kind="notfound" title="Issuer not found" action={back}>No stock issuer with ID {issuerId} exists in the source.</StateBox>
          : <StateBox kind="error" title="Could not load issuer" onRetry={() => q.refetch()} action={back}>{errorText(q.error)}</StateBox>
      ) : d ? (
        <>
          <header className="page-head issuer-head rise">
            <div>
              <div className="eyebrow">Issuer research</div>
              <h1 data-testid="text-issuer-name">{d.issuer.name}</h1>
              {d.issuer.website && <a className="text-link" href={d.issuer.website} target="_blank" rel="noreferrer" data-testid="link-issuer-website">{d.issuer.website.replace(/^https?:\/\//, '')} <ExternalLink aria-hidden="true" /></a>}
            </div>
            <dl className="issuer-stats">
              <div><dt>Market cap</dt><dd className={`mono ${d.issuer.marketCapUsd === null ? 'na' : ''}`} data-testid="text-issuer-cap">{usd(d.issuer.marketCapUsd)}</dd>{d.issuer.missingMarketCapCount > 0 && <small>Partial sum: {d.issuer.missingMarketCapCount} products N/A</small>}</div>
              <div><dt>24h volume</dt><dd className={`mono ${d.issuer.volume24hUsd === null ? 'na' : ''}`} data-testid="text-issuer-volume">{usd(d.issuer.volume24hUsd)}</dd></div>
              <div><dt>Stocks</dt><dd className="mono">{count(d.issuer.stockCount)}</dd></div>
              <div><dt>Products</dt><dd className="mono">{count(d.issuer.productCount)}</dd></div>
            </dl>
          </header>
          <p className="issuer-intro">{d.issuer.name} is listed by CoinMarketCap as an issuer of products referencing {count(d.issuer.stockCount)} covered stocks. This stock-only view includes {count(networks.length)} reported networks; it excludes the issuer's non-stock products.</p>
          <p className="fine">Totals exclude recognised wrapped products and may have incomplete coverage. Volume is reported traded value, not depth or liquidity.{missingVolume > 0 ? ` Volume sum is partial: ${missingVolume} non-wrapped products have no reported volume.` : ''}</p>
          <SourceBar source={d.source} onRefresh={() => q.refetch()} refreshing={q.isFetching} />
          <MetaWarning text={d.metadataWarning} />

          <section aria-labelledby="rank-title" className="rank-section">
            <div className="rank-head">
              <h2 id="rank-title">Stock products ranked by {SORT_LABEL[sort].toLowerCase()}</h2>
              <span className="muted mono" data-testid="text-rank-count">{rows.length} of {d.products.length}</span>
            </div>
            <div className="toolbar">
              <label className="search-field" htmlFor="prod-search">
                <Search aria-hidden="true" /><span className="sr-only">Search products or stocks</span>
                <input id="prod-search" type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Ticker, token or company" data-testid="input-product-search" />
              </label>
              <label className="select-wrap"><span>Network</span>
                <select value={net} onChange={e => { setNet(e.target.value); setPage(0); }} data-testid="select-network">
                  <option value="all">All networks</option>
                  {networks.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="seg" role="group" aria-label="Rank products by">
                {(Object.keys(SORT_LABEL) as SortKey[]).map(k => <button key={k} type="button" aria-pressed={sort === k} onClick={() => { setSort(k); setPage(0); }} data-testid={`button-sort-${k}`}>{SORT_LABEL[k]}</button>)}
              </div>
            </div>
            {rows.length === 0 ? <StateBox kind="empty" title="No products match these filters">Clear the search or choose All networks.</StateBox> : (
              <div className="table-scroll" tabIndex={0} aria-label="Product ranking table">
                <table className="rank-table">
                  <thead><tr><th scope="col">#</th><th scope="col">Stock</th><th scope="col">Token product</th><th scope="col" className="num">Token price</th><th scope="col" className="num">Market cap</th><th scope="col" className="num">24h volume</th><th scope="col">Networks</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
                  <tbody>
                    {visibleRows.map((p, i) => {
                      const s = stockMap.get(p.stockId);
                      const href = `/market-map?stock=${p.stockId}&issuer=${encodeURIComponent(p.issuerId)}&token=${p.id}`;
                      return (
                        <tr key={p.id} data-testid={`row-product-${p.id}`}>
                          <td className="mono muted">{currentPage * pageSize + i + 1}</td>
                          <td><b className="mono">{s?.symbol ?? p.stockId}</b><span className="sub">{s?.name ?? 'Stock'}</span></td>
                          <td><span className="mono">{p.symbol}</span>{p.isWrapped && <span className="tag wrap">Wrapped</span>}<span className="sub">{p.name}</span></td>
                          <td className={`num mono ${p.priceUsd === null ? 'na' : ''}`}>{tokenPrice(p.priceUsd)}</td>
                          <td className={`num mono ${p.marketCapUsd === null ? 'na' : ''}`}>{usd(p.marketCapUsd)}</td>
                          <td className={`num mono ${p.volume24hUsd === null ? 'na' : ''}`}>{usd(p.volume24hUsd)}</td>
                          <td><span className="nets">{p.networks.slice(0, 3).map(n => <span key={n} className="net">{n}</span>)}{p.networks.length > 3 && <span className="net">+{p.networks.length - 3}</span>}</span></td>
                          <td><Link href={href} className="row-go" data-testid={`link-map-${p.id}`} aria-label={`Open ${p.symbol} in Market Map`}>Map <ArrowUpRight aria-hidden="true" /></Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && <div className="pager" data-testid="panel-product-pagination">
              <span className="mono">{currentPage * pageSize + 1}–{Math.min(rows.length, (currentPage + 1) * pageSize)} of {count(rows.length)} products</span>
              <div>
                <button type="button" className="icon-btn" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous product page" data-testid="button-products-prev"><ChevronLeft aria-hidden="true" /></button>
                <button type="button" className="icon-btn" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} aria-label="Next product page" data-testid="button-products-next"><ChevronRight aria-hidden="true" /></button>
              </div>
            </div>}
          </section>
          <MarketGap access={d.marketAccess} />
        </>
      ) : null}
      <Methodology />
    </div>
  );
}
