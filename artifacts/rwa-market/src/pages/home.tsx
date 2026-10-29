import { Link } from 'wouter';
import { ArrowRight, Building2, Layers3, LockKeyhole } from 'lucide-react';
import { useGetEquityUniverse } from '@workspace/api-client-react';
import { Methodology, Skel } from '@/components/shell';
import { byNullLast, count, usd, usePageMeta } from '@/lib/format';

export default function Home() {
  usePageMeta('EHC DEX — A quote is not liquidity.', 'EHC DEX maps every tokenized version of a stock to its issuer, networks and contracts, so you can see what a ticker really represents before you look at a price.');
  const uni = useGetEquityUniverse();
  const top = uni.data ? [...uni.data.stocks].sort(byNullLast(s => s.tokenizedMarketCapUsd)).slice(0, 6) : [];

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy rise">
          <div className="eyebrow">Tokenized equity intelligence</div>
          <h1 id="page-title">A quote is<br /><span>not liquidity.</span></h1>
          <p className="hero-tag">One ticker. Many wrappers. Different markets.</p>
          <p className="hero-sub">EHC DEX is a research workspace for tokenized stocks. Pick a company and see which issuers have built products on it, how each product is deployed, and where reliable market data exists and where it does not.</p>
          <div className="hero-actions">
            <Link href="/market-map" className="btn btn-primary" data-testid="link-explore-map">Explore Market Map <ArrowRight aria-hidden="true" /></Link>
            <Link href="/issuers" className="btn" data-testid="link-browse-issuers">Browse Issuers</Link>
          </div>
        </div>
        <figure className="hero-art rise d2" data-testid="img-concept-illustration">
          <svg viewBox="0 0 520 340" role="img" aria-label="Concept diagram: one stock branching to several issuer products and onward to markets. Not data.">
            <defs>
              <linearGradient id="br" x1="0" x2="1"><stop offset="0" stopColor="#DDB779" /><stop offset="1" stopColor="#916BFF" /></linearGradient>
            </defs>
            <rect x="24" y="130" width="120" height="80" rx="12" fill="#121a33" stroke="#DDB779" />
            <text x="84" y="166" textAnchor="middle" fill="#f2f4fb" fontSize="15" fontWeight="700">STOCK</text>
            <text x="84" y="186" textAnchor="middle" fill="#9aa6c0" fontSize="10">one company</text>
            {[40, 135, 230].map((y, i) => (
              <g key={y}>
                <path className="branch" d={`M144 170 C 190 170, 190 ${y + 35}, 232 ${y + 35}`} fill="none" stroke="url(#br)" strokeWidth="1.5" />
                <rect x="232" y={y} width="112" height="70" rx="10" fill="#101727" stroke={i === 1 ? '#5B8CFF' : '#2a3557'} />
                <text x="288" y={y + 32} textAnchor="middle" fill="#e8ecf8" fontSize="12" fontWeight="600">Issuer {String.fromCharCode(65 + i)}</text>
                <text x="288" y={y + 50} textAnchor="middle" fill="#9aa6c0" fontSize="9">token · networks</text>
              </g>
            ))}
            <path className="branch" d="M344 170 C 380 170, 380 170, 404 170" fill="none" stroke="#5B8CFF" strokeWidth="2" />
            <rect x="404" y="120" width="96" height="100" rx="10" fill="none" stroke="#5B8CFF" strokeDasharray="4 4" />
            <text x="452" y="165" textAnchor="middle" fill="#c4d0f0" fontSize="11" fontWeight="600">markets</text>
            <text x="452" y="182" textAnchor="middle" fill="#9aa6c0" fontSize="9">where data allows</text>
          </svg>
          <figcaption>Concept only · lines show relationships, not flows</figcaption>
        </figure>
      </section>

      <section className="intro-band" aria-labelledby="intro-title">
        <h2 id="intro-title" className="intro-lead">A token's price tells you almost nothing about what you hold. The issuer, the legal wrapper, the network and the venue do.</h2>
        <div className="intro-steps">
          <article className="step"><span className="step-n mono">01</span><Building2 aria-hidden="true" /><h3>Start from the company</h3><p>Every product is anchored to its underlying stock by ID, with company profile and filings links on the left of the map.</p></article>
          <article className="step"><span className="step-n mono">02</span><Layers3 aria-hidden="true" /><h3>Separate the issuers</h3><p>Products are grouped by issuer, with token price, market cap, 24h volume, networks and contracts. Wrapped versions are labelled and kept out of totals.</p></article>
          <article className="step"><span className="step-n mono">03</span><LockKeyhole aria-hidden="true" /><h3>Be honest about markets</h3><p>Exchange-pair data is restricted on the current data plan. We show that gap plainly instead of inventing venues or depth.</p></article>
        </div>
      </section>

      <section className="coverage" aria-labelledby="cov-title">
        <div className="cov-head">
          <h2 id="cov-title">Current source coverage</h2>
          <p>Explore our research coverage, not an estimate of the entire tokenized-equity market.</p>
        </div>
        <div className="cov-stats">
          {uni.isLoading ? [0, 1, 2, 3].map(i => <div key={i} className="cov-stat"><Skel h={30} w="60%" /><Skel h={12} w="80%" /></div>) : uni.data ? (
            <>
              <div className="cov-stat"><strong className="mono" data-testid="text-count-tokenized">{count(uni.data.source.tokenizedStockCount)}</strong><span>stocks with tokenized products</span></div>
              <div className="cov-stat"><strong className="mono" data-testid="text-count-catalog">{count(uni.data.source.catalogStockCount)}</strong><span>stock profiles covered</span></div>
              <div className="cov-stat"><strong className="mono" data-testid="text-count-products">{count(uni.data.products.length)}</strong><span>distinct token products</span></div>
              <div className="cov-stat"><strong className="mono" data-testid="text-count-issuers">{count(uni.data.issuers.length)}</strong><span>issuers</span></div>
            </>
          ) : <p className="muted">Coverage figures are unavailable right now. The research pages explain the error and offer a retry.</p>}
        </div>
        {top.length > 0 && (
          <div className="cov-top">
            <span className="eyebrow">Largest tokenized cap in source</span>
            <div className="chip-row">
              {top.map(s => (
                <Link key={s.id} href={`/market-map?stock=${s.id}`} className="stock-chip" data-testid={`link-home-stock-${s.id}`}>
                  <b className="mono">{s.symbol}</b><span>{s.name}</span><em className="mono">{usd(s.tokenizedMarketCapUsd)}</em>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
      <Methodology />
    </>
  );
}
