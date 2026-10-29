import assert from 'node:assert/strict';
import { test } from 'node:test';
import { indicativeAsk, recommendVenues } from '../src/lib/venue-recommendations.ts';
import { buildDemoMarkets } from '../src/data/demo-markets.ts';

const row = (key, patch = {}) => ({
  key, venue: key, kind: 'CEX', pair: 'TEST/USD', network: null,
  priceUsd: 100, spreadBps: 10, depthBidUsd: 100, depthAskUsd: 100,
  volume24hUsd: 1000, ...patch,
});

test('price compares indicative buy-side asks including spread, not just mid prices', () => {
  const lowMid = row('low-mid', { priceUsd: 99.99, spreadBps: 100 });
  const narrow = row('narrow');
  assert.ok(indicativeAsk(lowMid) > indicativeAsk(narrow));
  assert.equal(recommendVenues([lowMid, narrow])[0].price.venue.key, 'narrow');
});

test('liquidity uses two-sided depth, not reported volume', () => {
  const result = recommendVenues([
    row('large-volume', { volume24hUsd: 1e9 }),
    row('deep', { depthBidUsd: 200, depthAskUsd: 300 }),
  ])[0];
  assert.equal(result.liquidity.venue.key, 'deep');
  assert.equal(result.liquidity.value, 500);
});

test('overall score uses the disclosed 40/40/20 formula within each venue kind', () => {
  const results = recommendVenues([
    row('cheap', { priceUsd: 90, spreadBps: 0 }),
    row('deep', { priceUsd: 110, spreadBps: 100, depthBidUsd: 500, depthAskUsd: 500 }),
    row('dex', { kind: 'DEX', priceUsd: 1 }),
  ]);
  assert.equal(results[0].overall.venue.key, 'cheap');
  assert.ok(Math.abs(results[0].overall.value - 60) < 1e-9);
  assert.equal(results[1].overall.venue.key, 'dex');
  assert.equal(results[1].overall.value, 100);
});

test('missing price does not invent a price or overall winner but can rank liquidity', () => {
  const result = recommendVenues([row('no-price', { priceUsd: null })])[0];
  assert.equal(result.price, null);
  assert.equal(result.overall, null);
  assert.equal(result.liquidity.venue.key, 'no-price');
});

test('nonfinite, negative and zero-depth inputs cannot produce invalid winners', () => {
  const result = recommendVenues([
    row('nan', { priceUsd: NaN, depthBidUsd: NaN }),
    row('negative', { priceUsd: -1, depthAskUsd: -1 }),
    row('zero', { depthBidUsd: 0, depthAskUsd: 0 }),
  ])[0];
  assert.equal(result.liquidity, null);
  assert.equal(result.overall, null);
  assert.equal(result.price.venue.key, 'zero');
  assert.equal(indicativeAsk(row('infinite', { spreadBps: Infinity })), null);
});

test('ties are stable, no peers stay empty, and inputs are not mutated', () => {
  const input = [row('b'), row('a')];
  const before = structuredClone(input);
  const [cex, dex] = recommendVenues(input);
  assert.equal(cex.price.venue.key, 'a');
  assert.equal(cex.liquidity.venue.key, 'a');
  assert.equal(cex.overall.venue.key, 'a');
  assert.deepEqual(dex, { kind: 'DEX', price: null, liquidity: null, overall: null });
  assert.deepEqual(input, before);
  assert.equal(recommendVenues([]).every(g => !g.price && !g.liquidity && !g.overall), true);
});

test('recommendations recompute from each selected product and generated demo peers', () => {
  const product = { id: 1, symbol: 'ONE', priceUsd: 10, networks: ['Ethereum'], contracts: [] };
  const a = buildDemoMarkets(product);
  const b = buildDemoMarkets({ ...product, id: 2, symbol: 'TWO', priceUsd: 200 });
  for (const set of [a, b]) {
    for (const group of recommendVenues(set.rows)) {
      assert.ok(group.price);
      assert.equal(group.price.value, Math.min(...set.rows.filter(r => r.kind === group.kind).map(indicativeAsk)));
      assert.ok(set.rows.includes(group.overall.venue));
    }
  }
  assert.notEqual(recommendVenues(a.rows)[0].price.value, recommendVenues(b.rows)[0].price.value);
});
