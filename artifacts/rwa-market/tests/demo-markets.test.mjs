import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDemoMarkets, filterDemoMarkets, summarizeDemoMarkets } from '../src/data/demo-markets.ts';

const product = {
  id: 38029, symbol: 'TSLAon', priceUsd: 401.31,
  networks: ['Ethereum', 'Solana', 'Ethereum'],
  contracts: [{ network: 'Ethereum' }, { network: 'BNB Smart Chain' }],
};

test('demo generation is deterministic, tagged, and does not mutate its input', () => {
  const before = structuredClone(product);
  const a = buildDemoMarkets(product);
  assert.deepEqual(a, buildDemoMarkets(product));
  assert.deepEqual(product, before);
  assert.equal(a.isDemo, true);
  assert.equal(a.productId, product.id);
  assert.ok(a.rows.length >= 3);
  assert.equal(new Set(a.rows.map(r => r.key)).size, a.rows.length);
  assert.ok(a.rows.every(r => r.venue.startsWith('Demo ')));
});

test('selected product identity, price and networks shape only its example venues', () => {
  const a = buildDemoMarkets(product);
  const b = buildDemoMarkets({ ...product, id: 38037, symbol: 'AAPLon', priceUsd: 209 });
  assert.notDeepEqual(a.rows, b.rows);
  assert.ok(b.rows.every(r => r.pair.startsWith('AAPLon/')));
  assert.ok(b.rows.every(r => Math.abs(r.priceUsd - 209) < 209 * 0.004));
  assert.ok(a.rows.filter(r => r.kind === 'DEX').every(r =>
    ['Ethereum', 'Solana', 'BNB Smart Chain'].includes(r.network)));
  assert.ok(a.rows.filter(r => r.kind === 'CEX').every(r => r.network === null));
});

test('missing contract/network data never creates a fictitious on-chain pool', () => {
  const a = buildDemoMarkets({ ...product, networks: [], contracts: [] });
  assert.ok(a.rows.length >= 2);
  assert.equal(filterDemoMarkets(a.rows, 'DEX').length, 0);
  const s = summarizeDemoMarkets([]);
  assert.equal(s.venueCount, 0);
  assert.equal(s.volume24hUsd, 0);
  assert.equal(s.depthTotalUsd, 0);
  assert.equal(s.medianSpreadBps, null);
});

test('missing, zero and invalid token prices remain N/A in the demo', () => {
  for (const priceUsd of [null, 0, -1, NaN, Infinity]) {
    const a = buildDemoMarkets({ ...product, priceUsd });
    assert.equal(a.basePriceUsd, null);
    assert.ok(a.rows.every(r => r.priceUsd === null));
  }
});

test('CEX and DEX filters are disjoint, complete, and preserve original rows', () => {
  const rows = buildDemoMarkets(product).rows;
  const before = structuredClone(rows);
  const cex = filterDemoMarkets(rows, 'CEX');
  const dex = filterDemoMarkets(rows, 'DEX');
  assert.ok(cex.every(r => r.kind === 'CEX'));
  assert.ok(dex.every(r => r.kind === 'DEX'));
  assert.equal(cex.length + dex.length, rows.length);
  assert.deepEqual(filterDemoMarkets(rows, 'all'), rows);
  assert.deepEqual(rows, before);
});

test('summary totals use only visible demo rows with volume separate from two-sided depth', () => {
  const rows = filterDemoMarkets(buildDemoMarkets(product).rows, 'DEX');
  const s = summarizeDemoMarkets(rows);
  assert.equal(s.cexCount, 0);
  assert.equal(s.dexCount, rows.length);
  assert.equal(s.volume24hUsd, rows.reduce((n, r) => n + r.volume24hUsd, 0));
  assert.equal(s.depthTotalUsd, rows.reduce((n, r) => n + r.depthBidUsd + r.depthAskUsd, 0));
  assert.notEqual(s.volume24hUsd, s.depthTotalUsd);
  assert.ok(s.medianSpreadBps > 0);
});

test('rows have positive finite illustrative metrics and are sorted by volume', () => {
  const rows = buildDemoMarkets(product).rows;
  for (let i = 0; i < rows.length; i++) {
    for (const key of ['priceUsd', 'volume24hUsd', 'spreadBps', 'depthBidUsd', 'depthAskUsd']) {
      assert.ok(Number.isFinite(rows[i][key]) && rows[i][key] > 0, key);
    }
    if (i) assert.ok(rows[i - 1].volume24hUsd >= rows[i].volume24hUsd);
  }
});
