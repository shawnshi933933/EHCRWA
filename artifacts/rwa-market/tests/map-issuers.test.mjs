import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMapIssuerGroups, MAP_ISSUER_LIMIT } from '../src/lib/map-issuers.ts';

const p = (id, issuerId, marketCapUsd, isWrapped = false) => ({ id, issuerId, marketCapUsd, isWrapped });
const names = new Map([['a', { name: 'Issuer A' }]]);

test('wrappers are hidden before grouping, aggregation and top-five ranking', () => {
  const products = [p(1, 'a', 50), p(2, 'a', 9_000, true), p(3, 'wrapped-only', 8_000, true), p(4, 'b', 100)];
  const result = buildMapIssuerGroups(products, names);
  assert.deepEqual(result.groups.map(g => g.issuerId), ['b', 'a']);
  assert.equal(result.groups[1].capSum, 50);
  assert.equal(result.groups[1].name, 'Issuer A');
  assert.deepEqual(result.groups[1].products.map(p => p.id), [1]);
});
test('only the top five issuers for this stock are visible, with full eligible count retained', () => {
  const products = Array.from({ length: 8 }, (_, i) => p(i + 1, `issuer${i}`, i * 100));
  const { groups, allGroups } = buildMapIssuerGroups(products, new Map());
  assert.equal(groups.length, MAP_ISSUER_LIMIT);
  assert.equal(allGroups.length, 8);
  assert.deepEqual(groups.map(g => g.capSum), [700, 600, 500, 400, 300]);
});
test('reported zero ranks ahead of unknown; partial sums remain explicit', () => {
  const { groups } = buildMapIssuerGroups([p(1, 'a', null), p(2, 'a', 10), p(3, 'b', null), p(4, 'c', 0)], names);
  assert.deepEqual(groups.map(g => g.issuerId), ['a', 'c', 'b']);
  assert.equal(groups[0].capHasNull, true);
  assert.equal(groups[2].capSum, null);
});
test('multiple products are summed per issuer, not counted as different issuers', () => {
  const { groups } = buildMapIssuerGroups([p(1, 'a', 60), p(2, 'a', 50), p(3, 'b', 100)], names);
  assert.equal(groups[0].issuerId, 'a');
  assert.equal(groups[0].capSum, 110);
  assert.deepEqual(groups[0].products.map(p => p.id), [1, 2]);
});
test('empty or wrapped-only coverage is empty, without substitute products', () => {
  assert.deepEqual(buildMapIssuerGroups([], names).groups, []);
  assert.deepEqual(buildMapIssuerGroups([p(1, 'a', 1, true)], names).groups, []);
});
test('ties are deterministic and source products remain unchanged', () => {
  const products = [p(2, 'b', 10), p(9, 'a', 5), p(8, 'a', 5)];
  const before = structuredClone(products);
  const { groups } = buildMapIssuerGroups(products, names);
  assert.deepEqual(groups.map(g => g.issuerId), ['a', 'b']);
  assert.deepEqual(groups[0].products.map(p => p.id), [8, 9]);
  assert.deepEqual(products, before);
});
