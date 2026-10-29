import { buildDemoMarkets, type DemoMarketInput, type DemoMarketRow } from '../data/demo-markets.ts';
import { recommendVenues } from './venue-recommendations.ts';

type ComparisonProduct = DemoMarketInput & { issuerId: string; isWrapped: boolean };
export type StockVenueRow = DemoMarketRow & {
  productId: number;
  productSymbol: string;
  issuerId: string;
  issuerName: string;
};

/**
 * All original issuer products for one underlying stock, independent of the Top 5
 * map projection and selected product. Prices are unadjusted demo token quotes,
 * not verified share-equivalent exposure costs.
 */
export function buildStockVenueComparison(
  products: readonly ComparisonProduct[],
  issuerNames: ReadonlyMap<string, { name: string }>,
) {
  const eligible = products.filter(p => !p.isWrapped);
  const rows: StockVenueRow[] = eligible.flatMap(product =>
    buildDemoMarkets(product).rows.map(row => ({
      ...row,
      key: `${product.id}:${row.key}`,
      productId: product.id,
      productSymbol: product.symbol,
      issuerId: product.issuerId,
      issuerName: issuerNames.get(product.issuerId)?.name ?? 'Unknown issuer',
    })),
  );
  return {
    rows,
    recommendations: recommendVenues(rows),
    issuerCount: new Set(eligible.map(p => p.issuerId)).size,
    productCount: eligible.length,
    excludedWrappedCount: products.length - eligible.length,
  };
}
