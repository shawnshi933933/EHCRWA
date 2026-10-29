import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStockVenueComparison } from '../src/lib/stock-venue-comparison.ts';
import { indicativeAsk } from '../src/lib/venue-recommendations.ts';

const p = (id, patch = {}) => ({
  id, issuerId: `issuer-${id}`, symbol: `TOKEN${id}`, priceUsd: 100 + id,
  networks: ['Solana'], contracts: [], isWrapped: false, ...patch,
});
const names = new Map([['issuer-1', { name: 'First Issuer' }]]);

test('includes every original issuer, not just the five displayed on map', () => {
  const products = Array.from({ length: 8 }, (_, i) => p(i + 1));
  const result = buildStockVenueComparison(products, names);
  assert.equal(result.issuerCount, 8);
  assert.equal(result.productCount, 8);
  assert.ok(result.rows.some(row => row.issuerId === 'issuer-8'));
  assert.equal(result.rows.find(row => row.productId === 1).issuerName, 'First Issuer');
});
test('ranks the global venue pool, and winners retain issuer and token identity', () => {
  const products = [p(1), p(2, { priceUsd: 1 })];
  const { rows, recommendations } = buildStockVenueComparison(products, names);
  for (const group of recommendations) {
    const peers = rows.filter(row => row.kind === group.kind);
    assert.equal(group.price.value, Math.min(...peers.map(indicativeAsk)));
    assert.equal(group.price.venue.productId, 2);
    assert.equal(group.price.venue.productSymbol, 'TOKEN2');
    assert.ok(rows.includes(group.overall.venue));
  }
});
test('wrapped copies are excluded without changing source products or dropping other issuers', () => {
  const products = [p(1), p(2, { isWrapped: true }), p(3, { issuerId: 'issuer-1' })];
  const before = structuredClone(products);
  const result = buildStockVenueComparison(products, names);
  assert.equal(result.excludedWrappedCount, 1);
  assert.equal(result.productCount, 2);
  assert.equal(result.issuerCount, 1);
  assert.ok(result.rows.every(row => row.productId !== 2));
  assert.deepEqual(products, before);
});
test('venue identifiers are unique across tokens sharing the same venue names', () => {
  const { rows } = buildStockVenueComparison([p(1), p(2)], names);
  assert.equal(new Set(rows.map(row => row.key)).size, rows.length);
});
test('unpriced products cannot win price or overall but still contribute depth', () => {
  const result = buildStockVenueComparison([p(1, { priceUsd: null })], names);
  for (const group of result.recommendations) {
    assert.equal(group.price, null);
    assert.equal(group.overall, null);
    assert.ok(group.liquidity);
  }
});
test('no networks creates no DEX picks and changing stock replaces all coverage', () => {
  const first = buildStockVenueComparison([p(1, { networks: [] })], names);
  assert.equal(first.recommendations[1].price, null);
  const next = buildStockVenueComparison([p(99)], names);
  assert.ok(next.rows.every(row => row.productId === 99));
  assert.equal(next.issuerCount, 1);
  const empty = buildStockVenueComparison([], names);
  assert.equal(empty.rows.length, 0);
  assert.ok(empty.recommendations.every(r => !r.price && !r.liquidity && !r.overall));
});
