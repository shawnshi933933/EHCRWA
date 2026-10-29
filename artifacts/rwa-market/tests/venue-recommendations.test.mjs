import assert from 'node:assert/strict';
import { test } from 'node:test';
import { referencePrice, venueLiquidity, recommendVenues } from '../src/lib/venue-recommendations.ts';
import { buildDemoMarkets } from '../src/data/demo-markets.ts';

const row = (key, patch = {}) => ({
  key, venue: key, kind: 'CEX', pair: 'TEST/USD', network: null,
  priceUsd: 100, depthBidUsd: 100, depthAskUsd: 100,
  liquidityScore: 500, poolLiquidityUsd: null, volume24hUsd: 1000, ...patch,
});

test('price ranks reference token quotes without fabricating an executable ask', () => {
  const result = recommendVenues([row('higher'), row('lower', { priceUsd: 99 })])[0];
  assert.equal(result.price.venue.key, 'lower');
  assert.equal(result.price.value, 99);
});
test('CEX liquidity ranks its score, not volume or DEX pool funds', () => {
  const result = recommendVenues([
    row('volume', { volume24hUsd: 1e9, poolLiquidityUsd: 1e12 }),
    row('score', { liquidityScore: 900 }),
  ])[0];
  assert.equal(result.liquidity.venue.key, 'score');
  assert.equal(result.liquidity.value, 900);
});
test('DEX liquidity ranks pool USD and ignores order-book fields or CEX score', () => {
  const result = recommendVenues([
    row('small', { kind: 'DEX', poolLiquidityUsd: 10000, liquidityScore: 1000, depthBidUsd: 1e9 }),
    row('large', { kind: 'DEX', poolLiquidityUsd: 20000, liquidityScore: null, depthBidUsd: null, depthAskUsd: null }),
  ])[1];
  assert.equal(result.liquidity.venue.key, 'large');
  assert.equal(result.liquidity.value, 20000);
  assert.ok(result.overall);
});
test('overall uses 40% price, 40% type-specific liquidity, 20% volume', () => {
  const result = recommendVenues([
    row('cheap-active', { priceUsd: 90, liquidityScore: 100, volume24hUsd: 2000 }),
    row('liquid', { priceUsd: 110, liquidityScore: 900, volume24hUsd: 1000 }),
    row('dex', { kind: 'DEX', poolLiquidityUsd: 200000 }),
  ]);
  assert.equal(result[0].overall.venue.key, 'cheap-active');
  assert.ok(Math.abs(result[0].overall.value - 60) < 1e-9);
  assert.equal(result[1].overall.value, 100);
});
test('missing prices preserve liquidity picks but cannot win price or overall', () => {
  const result = recommendVenues([row('missing', { priceUsd: null })])[0];
  assert.equal(result.price, null);
  assert.equal(result.overall, null);
  assert.ok(result.liquidity);
});
test('invalid scores, pool funds and prices never produce invalid winners', () => {
  for (const value of [null, -1, NaN, Infinity]) {
    assert.equal(referencePrice(row('bad', { priceUsd: value })), null);
    assert.equal(venueLiquidity(row('bad', { liquidityScore: value })), null);
    assert.equal(venueLiquidity(row('bad', { kind: 'DEX', poolLiquidityUsd: value })), null);
  }
  assert.equal(venueLiquidity(row('bad', { liquidityScore: 1001 })), null);
  assert.equal(recommendVenues([row('zero', { liquidityScore: 0 })])[0].liquidity, null);
  assert.equal(recommendVenues([row('badvol', { volume24hUsd: NaN })])[0].overall, null);
});
test('ties are deterministic, no peers remain empty and input is not mutated', () => {
  const input = [row('b'), row('a')];
  const before = structuredClone(input);
  const [cex, dex] = recommendVenues(input);
  assert.equal(cex.price.venue.key, 'a');
  assert.equal(cex.liquidity.venue.key, 'a');
  assert.equal(cex.overall.venue.key, 'a');
  assert.deepEqual(dex, { kind: 'DEX', price: null, liquidity: null, overall: null });
  assert.deepEqual(input, before);
});
test('realistic demo DEX candidates have no order book yet remain rankable', () => {
  const product = { id: 1, symbol: 'ONE', priceUsd: 10, networks: ['Ethereum'], contracts: [] };
  const { rows } = buildDemoMarkets(product);
  for (const group of recommendVenues(rows)) {
    assert.ok(group.price && group.liquidity && group.overall);
    assert.equal(group.price.value, Math.min(...rows.filter(r => r.kind === group.kind).map(referencePrice)));
  }
  assert.ok(rows.filter(r => r.kind === 'DEX').every(r => r.depthBidUsd === null && r.depthAskUsd === null));
});
