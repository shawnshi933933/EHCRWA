export const instruments = {
  TSLA: { name: 'Tesla, Inc.', sector: 'Consumer Discretionary', reference: 248.16, aliases: ['tesla', 'tesla inc'] },
  AAPL: { name: 'Apple Inc.', sector: 'Information Technology', reference: 213.07, aliases: ['apple', 'apple inc'] },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Information Technology', reference: 141.98, aliases: ['nvidia', 'nvidia corporation'] },
};
export type SymbolKey = keyof typeof instruments;
export type Product = {
  id: string; issuer: string; token: string; chain: string; chainGroup: string; price: number;
  depth: number; mechanism: string; basis: string; quoteSource: string; quoteAge: string; fee: number; gas: number; bridge: number;
  ticker: string; badge: string; sharesPerToken: number;
};
const AGE = 'Demo timestamp · not live';
const ondo = (sym: string, price: number, depth: number, spt: number, shares: string): Product => ({
  id: `ondo-${sym.toLowerCase()}-ethereum`, issuer: 'Ondo', token: `${sym}on`, chain: 'Ethereum', chainGroup: 'Ethereum', price, depth,
  mechanism: 'Total-return tracker; share quantity may adjust (unverified)', basis: `Illustrative exposure per token · ${shares} shares`,
  quoteSource: 'Simulated liquidity pool snapshot', quoteAge: AGE, fee: .24, gas: 3.18, bridge: 0, ticker: `${sym}on`, badge: 'O', sharesPerToken: spt,
});
const xs = (sym: string, price: number, depth: number): Product => ({
  id: `xstocks-${sym.toLowerCase()}-solana`, issuer: 'xStocks', token: `${sym}x`, chain: 'Solana', chainGroup: 'Solana', price, depth,
  mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share',
  quoteSource: 'Simulated aggregator estimate', quoteAge: AGE, fee: .3, gas: .08, bridge: 0, ticker: `${sym}x`, badge: 'x', sharesPerToken: 1,
});
export const productsBySymbol: Record<SymbolKey, Product[]> = {
  TSLA: [
    ondo('TSLA', 1.0247, 426000, .00413, '0.00413'), xs('TSLA', 248.16, 183000),
    { id: 'bstocks-tsla-bnb', issuer: 'bStocks', token: 'TSLAb', chain: 'BNB Chain', chainGroup: 'BNB Chain', price: 247.82, depth: 96500, mechanism: 'Issuer-defined wrapper · details unverified', basis: 'Illustrative exposure per token · 1.00 share', quoteSource: 'Simulated liquidity pool estimate', quoteAge: AGE, fee: .28, gas: .12, bridge: 0, ticker: 'TSLAb', badge: 'b', sharesPerToken: 1 },
  ],
  AAPL: [ondo('AAPL', 1.1192, 362000, .00526, '0.00526'), xs('AAPL', 213.07, 151000)],
  NVDA: [ondo('NVDA', .8716, 298000, .00704, '0.00704'), xs('NVDA', 141.98, 174000)],
};

/** Shared simulation formula: drives the quote panel and the order-size table. */
export function estimate(p: Product, symbol: SymbolKey, grossUsd: number, inputAsset: string) {
  const slippage = Math.min(2.4, .08 + grossUsd / Math.max(10000, p.depth * 38));
  const routeFee = grossUsd * p.fee / 100;
  const gas = p.gas * (inputAsset === 'ETH' ? .92 : 1);
  const bridgeFee = p.bridge;
  const feeUsd = routeFee + gas + bridgeFee;
  const output = Math.max(0, (grossUsd - feeUsd) * (1 - slippage / 100) / p.price);
  const underlyingExposure = output * p.sharesPerToken * instruments[symbol].reference;
  return { slippage, routeFee, gas, bridgeFee, feeUsd, output, underlyingExposure };
}
export const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
