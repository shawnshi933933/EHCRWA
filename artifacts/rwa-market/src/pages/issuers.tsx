import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, Search } from 'lucide-react';
import { useGetEquityUniverse } from '@workspace/api-client-react';
import { Methodology, Skel, SourceBar, StateBox } from '@/components/shell';
import { byNullLast, count, errorText, usd, usePageMeta } from '@/lib/format';

type SortKey = 'cap' | 'volume' | 'products';

export default function Issuers() {
  usePageMeta('Issuers of tokenized stocks · EHC DEX', 'Directory of issuers that publish tokenized stock products, ranked by reported market cap or 24h volume, with wrapped products excluded from totals.');
  const uni = useGetEquityUniverse();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('cap');
  const list = useMemo(() => {
    if (!uni.data) return [];
    const t = q.trim().toLowerCase();
    const f = t ? uni.data.issuers.filter(i => i.name.toLowerCase().includes(t)) : uni.data.issuers;
    const get = sort === 'cap' ? (i: typeof f[number]) => i.marketCapUsd : sort === 'volume' ? (i: typeof f[number]) => i.volume24hUsd : (i: typeof f[number]) => i.productCount;
    return [...f].sort(byNullLast(get));
  }, [uni.data, q, sort]);

  return (
    <div className="issuers-page">
      <header className="page-head rise">
        <div>
          <div className="eyebrow">Issuers · issuer view</div>
          <h1>Who issues tokenized stocks</h1>
          <p>Each issuer wraps stocks differently. Totals below count stock products only and exclude recognised wrapped versions.</p>
        </div>
      </header>
      {uni.data && <SourceBar source={uni.data.source} onRefresh={() => uni.refetch()} refreshing={uni.isFetching} />}
      <div className="toolbar">
        <label className="search-field" htmlFor="issuer-search">
          <Search aria-hidden="true" /><span className="sr-only">Search issuers</span>
          <input id="issuer-search" type="search" placeholder="Search issuer name" value={q} onChange={e => setQ(e.target.value)} data-testid="input-issuer-search" />
        </label>
        <div className="seg" role="group" aria-label="Rank issuers by">
          {([['cap', 'Market cap'], ['volume', '24h volume'], ['products', 'Product count']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} data-testid={`button-sort-${k}`}>{l}</button>
          ))}
        </div>
      </div>
      {uni.isLoading ? <div className="issuer-list">{Array.from({ length: 6 }, (_, i) => <div key={i} className="issuer-row"><Skel w="30%" h={18} /><Skel w="60%" h={12} /></div>)}</div>
        : uni.isError ? <StateBox kind="error" title="Issuer directory could not load" onRetry={() => uni.refetch()}>{errorText(uni.error)}</StateBox>
        : list.length === 0 ? <StateBox kind="empty" title="No issuer matches that search">Try a shorter name.</StateBox>
        : (
          <ol className="issuer-list" aria-label={`Issuers ranked by ${sort === 'cap' ? 'market cap' : sort === 'volume' ? '24h volume' : 'product count'}, N/A last`}>
            {list.map((i, idx) => (
              <li key={i.id}>
                <Link href={`/issuers/${i.id}`} className="issuer-row" data-testid={`link-issuer-${i.id}`}>
                  <span className="rank mono">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="ir-name"><b>{i.name}</b><em>{count(i.stockCount)} stocks · {count(i.productCount)} products</em></span>
                  <span className="ir-num"><i>Market cap</i><b className={`mono ${i.marketCapUsd === null ? 'na' : ''}`}>{usd(i.marketCapUsd)}</b>{i.missingMarketCapCount > 0 && <em>partial · {i.missingMarketCapCount} N/A</em>}</span>
                  <span className="ir-num"><i>24h volume</i><b className={`mono ${i.volume24hUsd === null ? 'na' : ''}`}>{usd(i.volume24hUsd)}</b></span>
                  <ChevronRight aria-hidden="true" className="ir-go" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      <Methodology />
    </div>
  );
}
