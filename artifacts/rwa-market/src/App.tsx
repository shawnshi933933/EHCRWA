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
    TSLA: { name: '特斯拉', sector: '非必需消费品', reference: 248.16, aliases: ['tesla', 'tesla inc'] },
    AAPL: { name: '苹果', sector: '信息技术', reference: 213.07, aliases: ['apple', 'apple inc'] },
    NVDA: { name: '英伟达', sector: '信息技术', reference: 141.98, aliases: ['nvidia', 'nvidia corporation'] },
  };
  type SymbolKey = keyof typeof instruments;
  type Product = {
    id: string; issuer: string; token: string; chain: string; chainGroup: string; price: number;
    depth: number; mechanism: string; basis: string; quoteSource: string; quoteAge: string; fee: number; gas: number; bridge: number;
    ticker: string; badge: string; sharesPerToken: number;
  };
  const productsBySymbol: Record<SymbolKey, Product[]> = {
    TSLA: [
      { id: 'ondo-tsla-ethereum', issuer: 'Ondo', token: 'TSLAon', chain: 'Ethereum', chainGroup: 'Ethereum', price: 1.0247, depth: 426000, mechanism: '总回报追踪；份额数量可能调整（待核验）', basis: '每枚代币示例等效敞口 · 0.00413 股', quoteSource: '模拟流动性池快照', quoteAge: '演示时间 · 非实时', fee: .24, gas: 3.18, bridge: 0, ticker: 'TSLAon', badge: 'O', sharesPerToken: .00413 },
      { id: 'xstocks-tsla-solana', issuer: 'xStocks', token: 'TSLAx', chain: 'Solana', chainGroup: 'Solana', price: 248.16, depth: 183000, mechanism: '发行方定义的包装方式 · 细节待核验', basis: '每枚代币示例等效敞口 · 1.00 股', quoteSource: '模拟聚合器估算', quoteAge: '演示时间 · 非实时', fee: .3, gas: .08, bridge: 0, ticker: 'TSLAx', badge: 'x', sharesPerToken: 1 },
      { id: 'bstocks-tsla-bnb', issuer: 'bStocks', token: 'TSLAb', chain: 'BNB Chain', chainGroup: 'BNB Chain', price: 247.82, depth: 96500, mechanism: '发行方定义的包装方式 · 细节待核验', basis: '每枚代币示例等效敞口 · 1.00 股', quoteSource: '模拟流动性池估算', quoteAge: '演示时间 · 非实时', fee: .28, gas: .12, bridge: 0, ticker: 'TSLAb', badge: 'b', sharesPerToken: 1 },
    ],
    AAPL: [
      { id: 'ondo-aapl-ethereum', issuer: 'Ondo', token: 'AAPLon', chain: 'Ethereum', chainGroup: 'Ethereum', price: 1.1192, depth: 362000, mechanism: '总回报追踪；份额数量可能调整（待核验）', basis: '每枚代币示例等效敞口 · 0.00526 股', quoteSource: '模拟流动性池快照', quoteAge: '演示时间 · 非实时', fee: .24, gas: 3.18, bridge: 0, ticker: 'AAPLon', badge: 'O', sharesPerToken: .00526 },
      { id: 'xstocks-aapl-solana', issuer: 'xStocks', token: 'AAPLx', chain: 'Solana', chainGroup: 'Solana', price: 213.07, depth: 151000, mechanism: '发行方定义的包装方式 · 细节待核验', basis: '每枚代币示例等效敞口 · 1.00 股', quoteSource: '模拟聚合器估算', quoteAge: '演示时间 · 非实时', fee: .3, gas: .08, bridge: 0, ticker: 'AAPLx', badge: 'x', sharesPerToken: 1 },
    ],
    NVDA: [
      { id: 'ondo-nvda-ethereum', issuer: 'Ondo', token: 'NVDAon', chain: 'Ethereum', chainGroup: 'Ethereum', price: .8716, depth: 298000, mechanism: '总回报追踪；份额数量可能调整（待核验）', basis: '每枚代币示例等效敞口 · 0.00704 股', quoteSource: '模拟流动性池快照', quoteAge: '演示时间 · 非实时', fee: .24, gas: 3.18, bridge: 0, ticker: 'NVDAon', badge: 'O', sharesPerToken: .00704 },
      { id: 'xstocks-nvda-solana', issuer: 'xStocks', token: 'NVDAx', chain: 'Solana', chainGroup: 'Solana', price: 141.98, depth: 174000, mechanism: '发行方定义的包装方式 · 细节待核验', basis: '每枚代币示例等效敞口 · 1.00 股', quoteSource: '模拟聚合器估算', quoteAge: '演示时间 · 非实时', fee: .3, gas: .08, bridge: 0, ticker: 'NVDAx', badge: 'x', sharesPerToken: 1 },
    ],
  };
  const [query, setQuery] = useState('TSLA');
  const [symbol, setSymbol] = useState<SymbolKey>('TSLA');
  const [chainFilter, setChainFilter] = useState('全部链');
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
    const filtered = currentProducts.filter(product => chainFilter === '全部链' || product.chain === chainFilter);
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
  const chainOptions = ['全部链', ...Array.from(new Set(currentProducts.map(product => product.chain)))];
  const compactAmount = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 6 });
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="brand-rwa-market">
          <span className="brand-mark"><Layers3 aria-hidden="true" /></span>
          <span>市场<span style={{ color: '#4d7770' }}> / RWA</span></span>
          <span className="brand-sub">链上股票资产信息</span>
        </div>
        <div className="top-right">
          <span className="network-note" data-testid="status-data-mode"><i className="live-dot" /> 本地演示 · 未连接网络</span>
          <button className="btn" data-testid="button-connect-wallet" onClick={() => setNotice('钱包连接当前不可用。此页面为本地原型，不会请求钱包权限或访问链上服务。')}>
            <Wallet aria-hidden="true" /> 连接钱包
          </button>
        </div>
      </header>
      <main className="page-wrap">
        <div className="notice-strip" role="note" data-testid="banner-demo-warning">
          <AlertTriangle className="notice-icon" aria-hidden="true" />
          <span><strong>演示数据 · 非实时 · 未核验合约 · 不执行交易</strong>　价格、深度、报价来源、gas、桥费与滑点均为模拟估算，不构成投资建议。</span>
        </div>
        <section className="hero" aria-labelledby="page-title">
          <div>
            <div className="eyebrow">跨发行方资产发现</div>
            <h1 id="page-title">同一只股票，不止一种代币。</h1>
            <p>按底层股票归组，逐项比较发行方版本。<strong>相同代码只用于搜索归组——代币、权利与风险并不相同，也不可互换。</strong></p>
          </div>
          <form className="search-wrap" onSubmit={event => { event.preventDefault(); submitSearch(); }}>
            <label className="search-label" htmlFor="asset-search">搜索股票</label>
            <div className="search-field">
              <Search aria-hidden="true" />
              <input id="asset-search" data-testid="input-stock-search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitSearch(); } }} placeholder="代码或公司名称，例如 TSLA" autoComplete="off" />
              <span className="search-shortcut">↵</span>
            </div>
            <div className="quick-symbols" aria-label="热门股票">
              {(Object.keys(instruments) as SymbolKey[]).map(key => <button type="button" key={key} data-testid={`button-quick-search-${key.toLowerCase()}`} onClick={() => selectSymbol(key)}>{key}</button>)}
            </div>
          </form>
        </section>
        <section aria-labelledby="comparison-title">
          <div className="section-heading">
            <div>
              <h2 id="comparison-title" data-testid="text-asset-heading">{symbol} <span style={{ color: '#7e898b', fontWeight: 450 }}>· {instruments[symbol].name}</span></h2>
              <p>{instruments[symbol].sector}　/　演示参考价 {money(instruments[symbol].reference)} · 非实时 · 非投资建议</p>
            </div>
            <div className="section-side">
              <label className="eyebrow" htmlFor="chain-filter" style={{ letterSpacing: '.06em' }}>筛选</label>
              <select id="chain-filter" className="select-control" data-testid="select-chain-filter" value={chainFilter} onChange={event => {
                const nextFilter = event.target.value;
                setChainFilter(nextFilter);
                const nextVisible = currentProducts.filter(product => nextFilter === '全部链' || product.chain === nextFilter);
                if (nextVisible.length && !nextVisible.some(product => product.id === selectedId)) setSelectedId(nextVisible[0].id);
              }}>
                {chainOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="eyebrow" htmlFor="sort-assets" style={{ letterSpacing: '.06em' }}>排序</label>
              <select id="sort-assets" className="select-control" data-testid="select-asset-sort" value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value="default">默认顺序</option><option value="depth">模拟深度：高 → 低</option><option value="price">代币价格：低 → 高</option>
              </select>
            </div>
          </div>
          <div className="asset-shell">
            {noSearchMatch ? <div className="empty-state" role="status" data-testid="state-no-search-results"><Search aria-hidden="true" /><strong>没有找到这只股票</strong><p>试试 TSLA、Tesla、AAPL、Apple、NVDA 或 NVIDIA。</p></div> : visibleProducts.length ? <div className="table-scroll">
              <table className="asset-table">
                <thead><tr>
                  <th>发行方版本</th><th>链</th><th>代币 / 地址状态</th><th>代币价格</th><th>每枚代币示例等效敞口</th><th>模拟深度</th><th>报价状态</th><th aria-label="选择报价"></th>
                </tr></thead>
                <tbody>
                  {visibleProducts.map(product => <tr key={product.id} className={`asset-row ${selected.id === product.id ? 'selected' : ''}`} data-testid={`row-asset-${product.id}`} onClick={() => { setSelectedId(product.id); setNotice(''); }} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(product.id); } }}>
                    <td><div className="token-name"><span className={`issuer-glyph ${product.issuer.toLowerCase()}`} aria-hidden="true">{product.badge}</span><span><span className="token-title">{product.issuer}</span><span className="token-sub">{product.ticker} · {symbol}</span></span></div></td>
                    <td><span className="chain-pill">{product.chain}</span></td>
                    <td><span className="token-title">{product.token}</span><span className="token-sub pending">地址：待核验</span></td>
                    <td><span className="price-main">{money(product.price)}</span><span className="price-caption">模拟代币价格</span></td>
                  <td><span className="price-main">{money(instruments[symbol].reference * product.sharesPerToken)}</span><span className="price-caption">{product.basis}</span></td>
                    <td><span className="depth-val">{money(product.depth)}</span><div className="depth-track"><span style={{ width: `${Math.max(18, Math.min(100, product.depth / 4500))}%` }} /></div></td>
                    <td><span className="state-pill"><i className="state-dot" />模拟报价</span><span className="token-sub">{product.quoteAge}</span></td>
                    <td><button type="button" className="select-row" data-testid={`button-select-quote-${product.id}`} aria-pressed={selected.id === product.id} onClick={event => { event.stopPropagation(); setSelectedId(product.id); setNotice(''); }}>{selected.id === product.id ? '已选报价' : '选择报价'}</button></td>
                  </tr>)}
                </tbody>
              </table>
            </div> : <div className="empty-state" data-testid="state-empty-chain"><Search aria-hidden="true" /><strong>该筛选条件下暂无演示版本</strong><p>更换链筛选，查看其他本地演示数据。</p></div>}
            <div className="table-foot"><span>样例展示仅用于界面演示；合约地址及挂牌状态未核验。</span><span data-testid="text-result-count">{visibleProducts.length} 个演示版本</span></div>
          </div>
        </section>
        {!noSearchMatch && <div className="lower-grid">
          <section className="panel" aria-labelledby="quote-title">
            <div className="panel-head"><div><h3 id="quote-title">模拟报价预览</h3><p>只计算本地示例数值，不连接报价服务</p></div><span className="demo-tag">仅模拟</span></div>
            <div className="quote-body">
              <div className="quote-token">
                <div className="quote-token-info"><span className={`issuer-glyph ${selected.issuer.toLowerCase()}`}>{selected.badge}</span><span><strong data-testid="text-selected-token">{selected.issuer} · {selected.token}</strong><span>{selected.chain}　/　地址待核验</span></span></div>
                <div className="quote-price" data-testid="text-selected-token-price">{money(selected.price)}<span>模拟代币单价</span></div>
              </div>
              <label className="form-label" htmlFor="buy-amount"><span>输入资产与金额</span><span>模拟估算</span></label>
              <div className="input-combo">
                <input id="buy-amount" data-testid="input-buy-amount" inputMode="decimal" type="number" min="0" step="any" value={amount} onChange={event => setAmount(event.target.value)} aria-label="买入金额" />
                <select data-testid="select-input-asset" aria-label="输入资产" value={inputAsset} onChange={event => {
                  const nextAsset = event.target.value;
                  const currentUsdValue = amountNumber * inputRate;
                  setInputAsset(nextAsset);
                  setAmount(String(nextAsset === 'ETH' ? Number((currentUsdValue / 2500).toFixed(6)) : currentUsdValue));
                }}><option value="USDC">USDC</option><option value="USDT">USDT</option><option value="ETH">ETH</option></select>
              </div>
              <div className="amount-chips" aria-label="快捷金额">
                {[250, 1000, 5000].map(value => <button type="button" key={value} data-testid={`button-amount-${value}`} onClick={() => setAmount(String(value / inputRate))}>{compactAmount(value / inputRate)} {inputAsset}</button>)}
              </div>
              <div className="quote-result" data-testid="panel-simulated-output">
                <div className="result-top"><span>预计收到 · {selected.token}</span><strong data-testid="text-estimated-output">{output.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} <em>{selected.token}</em></strong></div>
                <div className="result-value" data-testid="text-underlying-equivalent">示例等效底层敞口约 {money(underlyingExposure)} · 仅作单位口径说明</div>
              </div>
              <div className="fee-list">
                <div className="fee-item"><span>模拟路由费 ({selected.fee.toFixed(2)}%)</span><strong data-testid="text-route-fee">{money(routeFee)}</strong></div>
                <div className="fee-item"><span>模拟网络 Gas</span><strong data-testid="text-gas-estimate">{money(gas)}</strong></div>
                <div className="fee-item"><span>模拟桥费</span><strong data-testid="text-bridge-estimate">{money(bridgeFee)}</strong></div>
                <div className="fee-item"><span>合计模拟费用</span><strong data-testid="text-total-fees">{money(feeUsd)}</strong></div>
                <div className="fee-item"><span>预计滑点</span><strong data-testid="text-slippage-estimate">{slippage.toFixed(2)}% · 模拟</strong></div>
                <div className="fee-item"><span>估算输入价值</span><strong data-testid="text-input-value">{money(grossUsd)}</strong></div>
              </div>
              <button type="button" className="btn btn-primary quote-button" data-testid="button-preview-trade" onClick={() => setNotice('交易执行当前不可用。以上仅为客户端模拟估算，不会提交交易、调用合约或产生任何链上操作。')}>
                <LockKeyhole aria-hidden="true" /> 交易执行当前不可用
              </button>
              <div className="prototype-note">本原型不会签名、连接钱包或广播交易。</div>
              {notice && <div className="status-banner" role="status" data-testid="status-prototype-notice">{notice}</div>}
            </div>
          </section>
          <section className="panel" aria-labelledby="detail-title">
            <div className="panel-head"><div><h3 id="detail-title">资产机制与风险差异</h3><p data-testid="text-detail-issuer">{selected.issuer} · {selected.token} · {selected.chain}</p></div><span className="demo-tag">待核验字段已标注</span></div>
            <div className="detail-body">
              <div className="detail-row"><span className="detail-key">包装 / 追踪机制</span><span className="detail-value" data-testid="text-detail-mechanism">{selected.mechanism}</span></div>
                <div className="detail-row"><span className="detail-key">价格口径</span><span className="detail-value">代币单价与每枚代币的示例底层敞口分开展示；具体换算关系待核验。</span></div>
              <div className="detail-row"><span className="detail-key">分红与 rebase</span><span className="detail-value pending" data-testid="text-dividend-status">规则待核验</span></div>
              <div className="detail-row"><span className="detail-key">地区限制</span><span className="detail-value pending" data-testid="text-region-status">状态待核验</span></div>
              <div className="detail-row"><span className="detail-key">流动性场所</span><span className="detail-value pending" data-testid="text-venue-status">待核验 · 深度为模拟演示值</span></div>
              <div className="detail-row"><span className="detail-key">报价来源 / 时间</span><span className="detail-value" data-testid="text-quote-source">{selected.quoteSource}<br />{selected.quoteAge}</span></div>
              <div className="detail-row"><span className="detail-key">代币地址</span><span className="detail-value pending" data-testid="text-contract-status">未核验 · 不展示地址</span></div>
              <div className="risk-note" data-testid="notice-non-fungible"><strong>不是同一种资产。</strong> 同一股票代码仅用于搜索归组。不同发行方版本的法律包装、链、权利、定价与赎回路径可能不同；它们不可视为可互换的 1:1 代币。</div>
            </div>
          </section>
        </div>}
        <div className="bottom-note" data-testid="text-disclaimer"><ShieldAlert aria-hidden="true" /><span>此页面的全部价格、深度、来源、gas、桥费与滑点为客户端编制的模拟估算，非实时市场事实。发行方资料、合约、分红 / rebase 规则、地区可用性及流动性场所均未核验。请勿据此进行交易决策。</span></div>
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
