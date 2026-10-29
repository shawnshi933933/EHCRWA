import assert from 'node:assert/strict';
import { test } from 'node:test';
import { marketRefreshDelay } from '../src/lib/market-updates.ts';

const now = Date.parse('2026-10-29T08:00:00Z');
const data = expiresAt => ({ source: { expiresAt } });

test('automatic updates follow the current shared snapshot expiry', () => {
  assert.equal(marketRefreshDelay(data('2026-10-29T08:05:00Z'), now), 301_000);
});
test('expired snapshots and missing data retry with bounded backoff', () => {
  for (const value of [undefined, null, {}, { source: null }, data('invalid'), data('2026-10-29T07:59:00Z')]) {
    assert.equal(marketRefreshDelay(value, now), 60_000);
  }
});
test('refreshes never hammer the server or wait longer than fifteen minutes', () => {
  assert.equal(marketRefreshDelay(data('2026-10-29T08:00:01Z'), now), 60_000);
  assert.equal(marketRefreshDelay(data('2026-10-30T08:00:00Z'), now), 900_000);
});
