import test from "node:test";
import assert from "node:assert/strict";
import { buildMatrix, numberOrNull, safeUrl, sumKnown } from "../src/lib/equity-model.ts";

// Explicit fixtures for invariant tests; never imported by the running application.
const stocks = [
  { rwa_id: 14, symbol: "TSLA", name: "Tesla", slug: "tesla", asset_type: "stock", has_tokens: true },
  { rwa_id: 3, symbol: "AAPL", name: "Apple", slug: "apple", asset_type: "stock", has_tokens: true },
];
const issuers = [
  { issuer_id: "issuer-a", name: "Issuer A" },
  { issuer_id: "issuer-b", name: "Issuer B" },
  { issuer_id: "issuer-d", name: "NA (Derivatives)" },
];
const token = (id, issuer = "issuer-a", extra = {}) => ({
  crypto_id: id, issuer_id: issuer, issuer_name: issuers.find(row => row.issuer_id === issuer)?.name,
  name: "Stock product", symbol: "TOKEN", price: 10, market_cap: 100, volume_24h: 5, ...extra,
});
const quote = (stock, tokens) => ({
  ...stock, tokens, tokenized_market_cap: 1000, tokenized_volume_24h: 50,
  last_updated: "2026-10-29T00:00:00.000Z",
});

test("whitelists stock classification across directory, quotes and issuer aggregation", () => {
  const metals = { rwa_id: 1, symbol: "GOLD", name: "Gold", slug: "gold", asset_type: "commodity", has_tokens: true };
  const etf = { rwa_id: 4, symbol: "SPY", name: "ETF", slug: "spy", asset_type: "etf", has_tokens: true };
  const matrix = buildMatrix([...stocks, metals, etf], [
    quote(stocks[0], [token(10)]), quote(stocks[1], [token(20)]),
    quote(metals, [token(30)]), quote(etf, [token(40)]),
  ], issuers);
  assert.deepEqual(matrix.stocks.map(row => row.id), [14, 3]);
  assert.deepEqual(matrix.products.map(row => row.id), [10, 20]);
  assert.equal(matrix.issuers[0].stockCount, 2);
  assert.equal(matrix.issuers[0].marketCapUsd, 200);
});

test("same ticker never merges different underlying IDs or issuer products", () => {
  const sameTicker = stocks.map(row => ({ ...row, symbol: "SAME" }));
  const matrix = buildMatrix(sameTicker, [
    quote(sameTicker[0], [token(10), token(11, "issuer-b")]),
    quote(sameTicker[1], [token(20)]),
  ], issuers);
  assert.equal(matrix.stocks.length, 2);
  assert.equal(matrix.stocks[0].issuerCount, 2);
  assert.deepEqual(matrix.products.map(row => row.stockId), [14, 14, 3]);
});

test("one crypto ID counts once and wrapped products are separate but excluded from issuer sums", () => {
  const primary = token(10);
  const matrix = buildMatrix([stocks[0]], [quote(stocks[0], [
    primary, primary, token(11, "issuer-a", { name: "Wrapped Stock product", market_cap: 75 }),
    token(12, "issuer-a", { market_cap: null, volume_24h: null }),
  ])], issuers);
  assert.equal(matrix.products.length, 3);
  assert.equal(matrix.products.filter(row => row.isWrapped).length, 1);
  assert.equal(matrix.issuers[0].marketCapUsd, 100);
  assert.equal(matrix.issuers[0].volume24hUsd, 5);
  assert.equal(matrix.issuers[0].missingMarketCapCount, 1);
  assert.equal(matrix.stocks[0].tokenizedMarketCapUsd, 1000, "CMC aggregate is not relabeled as a deduplicated sum");
});

test("removes source-labeled derivatives without changing upstream stock aggregates", () => {
  const matrix = buildMatrix([stocks[0]], [quote(stocks[0], [token(10), token(11, "issuer-d")])], issuers);
  assert.equal(matrix.products.length, 1);
  assert.equal(matrix.issuers.length, 1);
  assert.equal(matrix.stocks[0].tokenizedMarketCapUsd, 1000);
  assert.match(matrix.warnings.join(" "), /derivative/);
});

test("unknown is not zero and nonfinite or negative financial fields cannot escape normalization", () => {
  for (const value of [undefined, null, "", "5", NaN, Infinity, -1]) assert.equal(numberOrNull(value), null);
  assert.equal(numberOrNull(0), 0);
  assert.equal(sumKnown([null, null]), null);
  assert.equal(sumKnown([null, 0]), 0);
  const matrix = buildMatrix([stocks[0]], [quote(stocks[0], [
    token(10, "issuer-a", { market_cap: null, volume_24h: null }),
  ])], issuers);
  assert.equal(matrix.issuers[0].marketCapUsd, null);
  assert.equal(matrix.issuers[0].volume24hUsd, null);
});

test("shared stock and issuer views are projections of the same economic product IDs", () => {
  const matrix = buildMatrix(stocks, [
    quote(stocks[0], [token(10), token(11, "issuer-b")]), quote(stocks[1], [token(20)]),
  ], issuers);
  for (const issuer of matrix.issuers) {
    const rows = matrix.products.filter(product => product.issuerId === issuer.id);
    assert.equal(issuer.productCount, rows.length);
    assert.equal(issuer.stockCount, new Set(rows.map(row => row.stockId)).size);
    assert.equal(issuer.marketCapUsd, sumKnown(rows.filter(row => !row.isWrapped).map(row => row.marketCapUsd)));
    for (const row of rows) assert.ok(matrix.stocks.some(stock => stock.id === row.stockId));
  }
});

test("refuses incomplete quote batches or ambiguous multi-stock product mapping", () => {
  assert.throws(() => buildMatrix(stocks, [quote(stocks[0], [])], issuers), /incomplete/);
  assert.throws(() => buildMatrix(stocks, [
    quote(stocks[0], [token(10)]), quote(stocks[1], [token(10)]),
  ], issuers), /multiple underlying/);
});

test("external links cannot use script or non-web protocols", () => {
  for (const url of ["javascript:alert(1)", "file:///etc/passwd", "data:text/html,hi", "invalid"]) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
