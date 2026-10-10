import { ArrowDown, Boxes, Gauge, GitBranch, Waypoints } from 'lucide-react';

export function Wordmark() {
  return (
    <span className="wordmark" data-testid="brand-ehc-dex">
      <img src={`${import.meta.env.BASE_URL}ehc-logo.png`} alt="" aria-hidden="true" className="wm-mark" width="38" height="38" data-testid="img-ehc-logo" />
      <span className="wm-text">EHC <b>DEX</b></span>
    </span>
  );
}

export function Hero() {
  return (
    <section className="brand-hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="eyebrow">Tokenized equities · Simulated prototype</div>
        <h1 id="page-title">A quote is<br /><span>not liquidity.</span></h1>
        <p className="hero-tag">Price shows the edge. Depth shows the market.</p>
        <p className="hero-sub">Compare tokenized equities across issuers and chains—with liquidity, estimated costs, and asset differences in view.</p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#markets" data-testid="link-explore-markets">Explore markets <ArrowDown aria-hidden="true" /></a>
          <span className="hero-caption">Local demo. No trading, no wallet.</span>
        </div>
      </div>
      <figure className="hero-art" data-testid="img-concept-illustration">
        <svg viewBox="0 0 520 360" role="img" aria-label="Concept illustration of layered liquidity planes with a gold flow entering from the left. Not market data.">
          <defs>
            <linearGradient id="pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5B8CFF" stopOpacity=".05" /><stop offset="1" stopColor="#916BFF" stopOpacity=".32" /></linearGradient>
            <linearGradient id="fl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#DDB779" stopOpacity="0" /><stop offset=".7" stopColor="#DDB779" /><stop offset="1" stopColor="#fff3d6" /></linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map(i => (
            <polygon key={i} points={`${230 + i * 50},${70 - i * 8} ${290 + i * 50},${50 - i * 8} ${290 + i * 50},${250 - i * 8} ${230 + i * 50},${280 - i * 8}`} fill="url(#pl)" stroke="#7a9bff" strokeOpacity={.55 - i * .07} />
          ))}
          <polygon points="222,92 232,88 232,262 222,270" fill="#DDB779" fillOpacity=".55" />
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path key={i} className="flow-line" d={`M0 ${290 + i * 6} C 90 ${250 - i * 10}, 150 ${300 - i * 8}, 224 ${180 + i * 6}`} fill="none" stroke="url(#fl)" strokeWidth={1.4 - i * .12} strokeDasharray="14 10" />
          ))}
          <path d="M232 150 C 300 120, 340 170, 400 110 S 470 90, 500 60" fill="none" stroke="#5B8CFF" strokeOpacity=".7" />
          <path d="M232 190 C 300 160, 350 210, 410 150 S 470 130, 500 100" fill="none" stroke="#916BFF" strokeOpacity=".6" />
        </svg>
        <figcaption>Concept illustration · not a data chart · no quantitative scale</figcaption>
      </figure>
    </section>
  );
}

const features = [
  { icon: Boxes, title: 'One equity, multiple wrappers', body: 'Discover the different issuer versions that reference the same underlying stock. A shared ticker is for discovery only.', status: 'Demo' },
  { icon: Gauge, title: 'Compare exposure, not just token prices', body: 'Token price and illustrative underlying exposure per token are shown side by side. A lower unit price is not a better price.', status: 'Demo' },
  { icon: Waypoints, title: 'Depth before decisions', body: 'Enter an amount and see simulated price impact and fees at several order sizes, with assumptions stated.', status: 'Demo · simulated' },
  { icon: GitBranch, title: 'Cross-chain execution', body: 'Routing across chains is on the roadmap. Nothing here executes, bridges, or connects a wallet today.', status: 'Planned' },
];
export function Features() {
  return (
    <section className="features" aria-labelledby="features-title">
      <h2 id="features-title" className="sr-only">Product features</h2>
      {features.map(f => (
        <article key={f.title} className={`feature ${f.status === 'Planned' ? 'planned' : ''}`} data-testid={`card-feature-${f.status === 'Planned' ? 'planned' : 'demo'}-${f.title.split(' ')[0].toLowerCase()}`}>
          <div className="feature-top"><f.icon aria-hidden="true" /><span className="feature-status">{f.status}</span></div>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </article>
      ))}
    </section>
  );
}
