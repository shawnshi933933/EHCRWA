import { type ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  AlertTriangle,
  Layers3,
  LockKeyhole,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const instruments = {
    TSLA: { name: 'Tesla, Inc.', sector: 'Consumer Discretionary', reference: 248.16, aliases: ['tesla', 'tesla inc'] },
    AAPL: { name: 'Apple Inc.', sector: 'Information Technology', reference: 213.07, aliases: ['apple', 'apple inc'] },
    NVDA: { name: 'NVIDIA Corporation', sector: 'Information Technology', reference: 141.98, aliases: ['nvidia', 'nvidia corporation'] },
  };
  type SymbolKey = keyof typeof instruments;
  type Product = {
    id: string; issuer: string; token: string; chain: string; chainGroup: string; price: number;
    depth: number; mechanism: string; basis: string; quoteSource: string; quoteAge: string; fee: number; gas: number; bridge: number;
    ticker: string; badge: string; sharesPerToken: number;
  };
  const productsBySymbol: Record<SymbolKey, Product[]> = {
    TSLA: [
      { id: 'ondo-tsla-ethereum', issuer: 'Ondo', token: 'TSLAon', chain: 'Ethereum', chainGroup: 'Ethereum', price: 1.0247, depth: 426000, mechanism: 'Total-return tracker; share quantity may adjust (unverified)', basis: 'Illustrative exposure per token · 0.00413 shares', quoteSource: 'Simulated liquidity pool snapshot', quoteAge: 'Demo timestamp · not live', fee: .24, gas: 3.18, bridge: 0, ticker: 'TSLAon', badge: 'O', sharesPerToken: .00413 },
      { id: 'xstocks-tsla-solana', issuer: 'xStocks', token: 'TSLAx', chain: 'Solana', chainGroup: 'Solana', price: 248.16, depth: 183000, mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share', quoteSource: 'Simulated aggregator estimate', quoteAge: 'Demo timestamp · not live', fee: .3, gas: .08, bridge: 0, ticker: 'TSLAx', badge: 'x', sharesPerToken: 1 },
      { id: 'bstocks-tsla-bnb', issuer: 'bStocks', token: 'TSLAb', chain: 'BNB Chain', chainGroup: 'BNB Chain', price: 247.82, depth: 96500, mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share', quoteSource: 'Simulated liquidity pool estimate', quoteAge: 'Demo timestamp · not live', fee: .28, gas: .12, bridge: 0, ticker: 'TSLAb', badge: 'b', sharesPerToken: 1 },
    ],
    AAPL: [
      { id: 'ondo-aapl-ethereum', issuer: 'Ondo', token: 'AAPLon', chain: 'Ethereum', chainGroup: 'Ethereum', price: 1.1192, depth: 362000, mechanism: 'Total-return tracker; share quantity may adjust (unverified)', basis: 'Illustrative exposure per token · 0.00526 shares', quoteSource: 'Simulated liquidity pool snapshot', quoteAge: 'Demo timestamp · not live', fee: .24, gas: 3.18, bridge: 0, ticker: 'AAPLon', badge: 'O', sharesPerToken: .00526 },
      { id: 'xstocks-aapl-solana', issuer: 'xStocks', token: 'AAPLx', chain: 'Solana', chainGroup: 'Solana', price: 213.07, depth: 151000, mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share', quoteSource: 'Simulated aggregator estimate', quoteAge: 'Demo timestamp · not live', fee: .3, gas: .08, bridge: 0, ticker: 'AAPLx', badge: 'x', sharesPerToken: 1 },
    ],
    NVDA: [
      { id: 'ondo-nvda-ethereum', issuer: 'Ondo', token: 'NVDAon', chain: 'Ethereum', chainGroup: 'Ethereum', price: .8716, depth: 298000, mechanism: 'Total-return tracker; share quantity may adjust (unverified)', basis: 'Illustrative exposure per token · 0.00704 shares', quoteSource: 'Simulated liquidity pool snapshot', quoteAge: 'Demo timestamp · not live', fee: .24, gas: 3.18, bridge: 0, ticker: 'NVDAon', badge: 'O', sharesPerToken: .00704 },
      { id: 'xstocks-nvda-solana', issuer: 'xStocks', token: 'NVDAx', chain: 'Solana', chainGroup: 'Solana', price: 141.98, depth: 174000, mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share', quoteSource: 'Simulated aggregator estimate', quoteAge: 'Demo timestamp · not live', fee: .3, gas: .08, bridge: 0, ticker: 'NVDAx', badge: 'x', sharesPerToken: 1 },
    ],
  };
  const [query, setQuery] = useState('TSLA');
  const [symbol, setSymbol] = useState<SymbolKey>('TSLA');
  const [chainFilter, setChainFilter] = useState('All chains');
  const [sortBy, setSortBy] = useState('default');
  const [selectedId, setSelectedId] = useState('ondo-tsla-ethereum');
  const [amount, setAmount] = useState('1000');
  const [inputAsset, setInputAsset] = useState('USDC');
  const [notice, setNotice] = useState('');
  const [noSearchMatch, setNoSearchMatch] = useState(false);
  const matchingSymbol = (raw: string): SymbolKey | null => {
    const normalized = raw.trim().toUpperCase();
    return (Object.keys(instruments) as SymbolKey[]).find(key => key === normalized || instruments[key].aliases.includes(raw.trim().toLowerCase())) ?? null;
  };
  const currentProducts = productsBySymbol[symbol];
  const visibleProducts = useMemo(() => {
    const filtered = currentProducts.filter(product => chainFilter === 'All chains' || product.chain === chainFilter);
    if (sortBy === 'depth') return [...filtered].sort((a, b) => b.depth - a.depth);
    if (sortBy === 'price') return [...filtered].sort((a, b) => a.price - b.price);
    return filtered;
  }, [currentProducts, chainFilter, sortBy]);
  const selected = currentProducts.find(product => product.id === selectedId) ?? currentProducts[0];
  const amountNumber = Math.max(0, Number(amount) || 0);
  const inputRate = inputAsset === 'ETH' ? 2500 : 1;
  const grossUsd = amountNumber * inputRate;
  const slippage = Math.min(2.4, .08 + grossUsd / Math.max(10000, selected.depth * 38));
  const routeFee = grossUsd * selected.fee / 100;
  const gas = selected.gas * (inputAsset === 'ETH' ? .92 : 1);
  const bridgeFee = selected.bridge;
  const feeUsd = routeFee + gas + bridgeFee;
  const output = Math.max(0, (grossUsd - feeUsd) * (1 - slippage / 100) / selected.price);
  const underlyingExposure = output * selected.sharesPerToken * instruments[symbol].reference;
  const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const selectSymbol = (key: SymbolKey) => {
    setSymbol(key); setQuery(key); setChainFilter('All chains'); setSortBy('default');
    setSelectedId(productsBySymbol[key][0].id); setNotice(''); setNoSearchMatch(false);
  };
  const submitSearch = () => {
    const found = matchingSymbol(query);
    if (found) selectSymbol(found);
    else setNoSearchMatch(true);
  };
  const chainOptions = ['All chains', ...Array.from(new Set(currentProducts.map(product => product.chain)))];
  const compactAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="brand-rwa-market">
          <span className="brand-mark"><Layers3 aria-hidden="true" /></span>
          <span>MARKET<span style={{ color: '#4d7770' }}> / RWA</span></span>
          <span className="brand-sub">Tokenized equity intelligence</span>
        </div>
        <div className="top-right">
          <span className="network-note" data-testid="status-data-mode"><i className="live-dot" /> LOCAL DEMO · OFFLINE</span>
          <button className="btn" data-testid="button-connect-wallet" onClick={() => setNotice('Wallet connection is unavailable in this prototype. No wallet permissions or on-chain services will be requested.')}>
            <Wallet aria-hidden="true" /> Connect wallet
          </button>
        </div>
      </header>
      <main className="page-wrap">
        <div className="notice-strip" role="note" data-testid="banner-demo-warning">
          <AlertTriangle className="notice-icon" aria-hidden="true" />
          <span><strong>Demo data · Not live · Contracts unverified · No trading</strong> Prices, depth, quote sources, gas, bridge fees, and slippage are simulated estimates, not investment advice.</span>
        </div>
        <section className="hero" aria-labelledby="page-title">
          <div>
            <div className="eyebrow">CROSS-ISSUER ASSET DISCOVERY</div>
            <h1 id="page-title">One stock. More than one token.</h1>
            <p>Compare issuer-specific versions grouped by the underlying equity. <strong>A shared ticker is for discovery only—tokens may carry different rights and risks, and are not interchangeable.</strong></p>
          </div>
          <form className="search-wrap" onSubmit={event => { event.preventDefault(); submitSearch(); }}>
            <label className="search-label" htmlFor="asset-search">Search stocks</label>
            <div className="search-field">
              <Search aria-hidden="true" />
              <input id="asset-search" data-testid="input-stock-search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitSearch(); } }} placeholder="Ticker or company name, e.g. TSLA" autoComplete="off" />
              <span className="search-shortcut">↵</span>
            </div>
            <div className="quick-symbols" aria-label="Popular stocks">
              {(Object.keys(instruments) as SymbolKey[]).map(key => <button type="button" key={key} data-testid={`button-quick-search-${key.toLowerCase()}`} onClick={() => selectSymbol(key)}>{key}</button>)}
            </div>
          </form>
        </section>
        <section aria-labelledby="comparison-title">
          <div className="section-heading">
            <div>
              <h2 id="comparison-title" data-testid="text-asset-heading">{symbol} <span style={{ color: '#7e898b', fontWeight: 450 }}>· {instruments[symbol].name}</span></h2>
              <p>{instruments[symbol].sector} / Illustrative reference {money(instruments[symbol].reference)} · Not live · Not investment advice</p>
            </div>
            <div className="section-side">
              <label className="eyebrow" htmlFor="chain-filter" style={{ letterSpacing: '.06em' }}>NETWORK</label>
              <select id="chain-filter" className="select-control" data-testid="select-chain-filter" value={chainFilter} onChange={event => {
                const nextFilter = event.target.value;
                setChainFilter(nextFilter);
                const nextVisible = currentProducts.filter(product => nextFilter === 'All chains' || product.chain === nextFilter);
                if (nextVisible.length && !nextVisible.some(product => product.id === selectedId)) setSelectedId(nextVisible[0].id);
              }}>
                {chainOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="eyebrow" htmlFor="sort-assets" style={{ letterSpacing: '.06em' }}>SORT</label>
              <select id="sort-assets" className="select-control" data-testid="select-asset-sort" value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value="default">Default order</option><option value="depth">Simulated depth: high → low</option><option value="price">Token price: low → high</option>
              </select>
            </div>
          </div>
          <div className="asset-shell">
            {noSearchMatch ? <div className="empty-state" role="status" data-testid="state-no-search-results"><Search aria-hidden="true" /><strong>No matching stock found</strong><p>Try TSLA, Tesla, AAPL, Apple, NVDA, or NVIDIA.</p></div> : visibleProducts.length ? <div className="table-scroll">
              <table className="asset-table">
                <thead><tr>
                  <th>Issuer / version</th><th>Network</th><th>Token / address status</th><th>Token price</th><th>Illustrative underlying exposure per token</th><th>Simulated depth</th><th>Quote status</th><th aria-label="Select a quote"></th>
                </tr></thead>
                <tbody>
                  {visibleProducts.map(product => <tr key={product.id} className={`asset-row ${selected.id === product.id ? 'selected' : ''}`} data-testid={`row-asset-${product.id}`} onClick={() => { setSelectedId(product.id); setNotice(''); }} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(product.id); } }}>
                    <td><div className="token-name"><span className={`issuer-glyph ${product.issuer.toLowerCase()}`} aria-hidden="true">{product.badge}</span><span><span className="token-title">{product.issuer}</span><span className="token-sub">{product.ticker} · {symbol}</span></span></div></td>
                    <td><span className="chain-pill">{product.chain}</span></td>
                    <td><span className="token-title">{product.token}</span><span className="token-sub pending">Address: unverified</span></td>
                    <td><span className="price-main">{money(product.price)}</span><span className="price-caption">Simulated token price</span></td>
                  <td><span className="price-main">{money(instruments[symbol].reference * product.sharesPerToken)}</span><span className="price-caption">{product.basis}</span></td>
                    <td><span className="depth-val">{money(product.depth)}</span><div className="depth-track"><span style={{ width: `${Math.max(18, Math.min(100, product.depth / 4500))}%` }} /></div></td>
                    <td><span className="state-pill"><i className="state-dot" />Simulated quote</span><span className="token-sub">{product.quoteAge}</span></td>
                    <td><button type="button" className="select-row" data-testid={`button-select-quote-${product.id}`} aria-pressed={selected.id === product.id} onClick={event => { event.stopPropagation(); setSelectedId(product.id); setNotice(''); }}>{selected.id === product.id ? 'Selected' : 'Select quote'}</button></td>
                  </tr>)}
                </tbody>
              </table>
            </div> : <div className="empty-state" data-testid="state-empty-chain"><Search aria-hidden="true" /><strong>No demo assets for this network</strong><p>Change the network filter to view other local examples.</p></div>}
            <div className="table-foot"><span>Examples are for interface demonstration only; contract addresses and listing status are unverified.</span><span data-testid="text-result-count">{visibleProducts.length} demo versions</span></div>
          </div>
        </section>
        {!noSearchMatch && <div className="lower-grid">
          <section className="panel" aria-labelledby="quote-title">
            <div className="panel-head"><div><h3 id="quote-title">Simulated quote preview</h3><p>Local example calculations only. No quote service is connected.</p></div><span className="demo-tag">SIMULATED</span></div>
            <div className="quote-body">
              <div className="quote-token">
                <div className="quote-token-info"><span className={`issuer-glyph ${selected.issuer.toLowerCase()}`}>{selected.badge}</span><span><strong data-testid="text-selected-token">{selected.issuer} · {selected.token}</strong><span>{selected.chain} / Address unverified</span></span></div>
                <div className="quote-price" data-testid="text-selected-token-price">{money(selected.price)}<span>Simulated token price</span></div>
              </div>
              <label className="form-label" htmlFor="buy-amount"><span>Input asset and amount</span><span>Illustrative estimate</span></label>
              <div className="input-combo">
                <input id="buy-amount" data-testid="input-buy-amount" inputMode="decimal" type="number" min="0" step="any" value={amount} onChange={event => setAmount(event.target.value)} aria-label="Buy amount" />
                <select data-testid="select-input-asset" aria-label="Input asset" value={inputAsset} onChange={event => {
                  const nextAsset = event.target.value;
                  const currentUsdValue = amountNumber * inputRate;
                  setInputAsset(nextAsset);
                  setAmount(String(nextAsset === 'ETH' ? Number((currentUsdValue / 2500).toFixed(6)) : currentUsdValue));
                }}><option value="USDC">USDC</option><option value="USDT">USDT</option><option value="ETH">ETH</option></select>
              </div>
              <div className="amount-chips" aria-label="Quick amounts">
                {[250, 1000, 5000].map(value => <button type="button" key={value} data-testid={`button-amount-${value}`} onClick={() => setAmount(String(value / inputRate))}>{compactAmount(value / inputRate)} {inputAsset}</button>)}
              </div>
              <div className="quote-result" data-testid="panel-simulated-output">
                <div className="result-top"><span>Estimated output · {selected.token}</span><strong data-testid="text-estimated-output">{output.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} <em>{selected.token}</em></strong></div>
                <div className="result-value" data-testid="text-underlying-equivalent">Illustrative underlying exposure ≈ {money(underlyingExposure)} · Unit reference only</div>
              </div>
              <div className="fee-list">
                <div className="fee-item"><span>Simulated route fee ({selected.fee.toFixed(2)}%)</span><strong data-testid="text-route-fee">{money(routeFee)}</strong></div>
                <div className="fee-item"><span>Simulated network gas</span><strong data-testid="text-gas-estimate">{money(gas)}</strong></div>
                <div className="fee-item"><span>Simulated bridge fee</span><strong data-testid="text-bridge-estimate">{money(bridgeFee)}</strong></div>
                <div className="fee-item"><span>Total simulated fees</span><strong data-testid="text-total-fees">{money(feeUsd)}</strong></div>
                <div className="fee-item"><span>Estimated slippage</span><strong data-testid="text-slippage-estimate">{slippage.toFixed(2)}% · simulated</strong></div>
                <div className="fee-item"><span>Estimated input value</span><strong data-testid="text-input-value">{money(grossUsd)}</strong></div>
              </div>
              <button type="button" className="btn btn-primary quote-button" data-testid="button-preview-trade" onClick={() => setNotice('Trade execution is unavailable. This is a client-side simulation only; no transaction, contract call, or on-chain action will be submitted.')}>
                <LockKeyhole aria-hidden="true" /> Trade execution unavailable
              </button>
              <div className="prototype-note">This prototype will not sign, connect a wallet, or broadcast transactions.</div>
              {notice && <div className="status-banner" role="status" data-testid="status-prototype-notice">{notice}</div>}
            </div>
          </section>
          <section className="panel" aria-labelledby="detail-title">
            <div className="panel-head"><div><h3 id="detail-title">Asset mechanics and risk differences</h3><p data-testid="text-detail-issuer">{selected.issuer} · {selected.token} · {selected.chain}</p></div><span className="demo-tag">UNVERIFIED FIELDS MARKED</span></div>
            <div className="detail-body">
              <div className="detail-row"><span className="detail-key">Wrapper / tracking mechanics</span><span className="detail-value" data-testid="text-detail-mechanism">{selected.mechanism}</span></div>
              <div className="detail-row"><span className="detail-key">Price basis</span><span className="detail-value">Token price and illustrative underlying exposure per token are shown separately; the actual conversion terms are unverified.</span></div>
              <div className="detail-row"><span className="detail-key">Dividends / rebase</span><span className="detail-value pending" data-testid="text-dividend-status">Terms unverified</span></div>
              <div className="detail-row"><span className="detail-key">Regional restrictions</span><span className="detail-value pending" data-testid="text-region-status">Availability unverified</span></div>
              <div className="detail-row"><span className="detail-key">Liquidity venues</span><span className="detail-value pending" data-testid="text-venue-status">Unverified · depth is simulated</span></div>
              <div className="detail-row"><span className="detail-key">Quote source / time</span><span className="detail-value" data-testid="text-quote-source">{selected.quoteSource}<br />{selected.quoteAge}</span></div>
              <div className="detail-row"><span className="detail-key">Token contract</span><span className="detail-value pending" data-testid="text-contract-status">Unverified · address not shown</span></div>
              <div className="risk-note" data-testid="notice-non-fungible"><strong>These are not the same asset.</strong> A shared stock ticker is for discovery only. Issuer versions may differ in legal wrapper, network, rights, pricing, and redemption path; do not treat them as interchangeable 1:1 tokens.</div>
            </div>
          </section>
        </div>}
        <div className="bottom-note" data-testid="text-disclaimer"><ShieldAlert aria-hidden="true" /><span>All prices, depth, sources, gas, bridge fees, and slippage on this page are client-side simulations, not live market data. Issuer information, contracts, dividend/rebase terms, regional availability, and liquidity venues are unverified. Do not use this page to make trading decisions.</span></div>
      </main>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
