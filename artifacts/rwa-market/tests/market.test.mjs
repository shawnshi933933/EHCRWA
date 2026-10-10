import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate, instruments, productsBySymbol } from '../src/data/market.ts';

test('every demo wrapper uses a consistent fee, output and exposure model', () => {
  for (const [symbol, products] of Object.entries(productsBySymbol)) {
    for (const product of products) {
      for (const asset of ['USDC', 'USDT', 'ETH']) {
        for (const size of [0, 250, 1000, 5000, 25000, 100000]) {
          const result = estimate(product, symbol, size, asset);
          const impact = Math.min(2.4, .08 + size / Math.max(10000, product.depth * 38));
          assert.equal(result.slippage, impact);
          assert.equal(result.feeUsd, result.routeFee + result.gas + result.bridgeFee);
          assert.equal(result.output, Math.max(0, (size - result.feeUsd) * (1 - impact / 100) / product.price));
          assert.equal(result.underlyingExposure, result.output * product.sharesPerToken * instruments[symbol].reference);
          for (const value of Object.values(result)) assert.ok(Number.isFinite(value) && value >= 0);
        }
      }
    }
  }
});

test('order-size scenarios increase impact and fees using the quote model', () => {
  for (const [symbol, products] of Object.entries(productsBySymbol)) {
    for (const product of products) {
      const small = estimate(product, symbol, 250, 'USDC');
      const large = estimate(product, symbol, 100000, 'USDC');
      assert.ok(large.slippage > small.slippage);
      assert.ok(large.feeUsd > small.feeUsd);
      assert.ok(large.output > small.output);
      assert.equal(estimate(product, symbol, 0, 'USDC').output, 0);
    }
  }
});

test('stablecoin choice does not alter estimates; ETH gas assumption is explicit', () => {
  const product = productsBySymbol.TSLA[0];
  assert.deepEqual(estimate(product, 'TSLA', 1000, 'USDC'), estimate(product, 'TSLA', 1000, 'USDT'));
  assert.equal(estimate(product, 'TSLA', 1000, 'ETH').gas, product.gas * .92);
});

test('the impact cap and a shallow pool do not create negative outputs', () => {
  const product = { ...productsBySymbol.TSLA[0], depth: 0 };
  assert.equal(estimate(product, 'TSLA', 1000000, 'USDC').slippage, 2.4);
  assert.equal(estimate(product, 'TSLA', .01, 'USDC').output, 0);
});
