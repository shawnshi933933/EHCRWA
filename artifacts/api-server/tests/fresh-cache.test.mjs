/**
 * Integration check using a NEW disposable development database.
 * Never drops or mutates the application's existing database.
 * Run: pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/tests/fresh-cache.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Resolve the driver from its owning workspace package; no duplicate dependency.
const pg = createRequire(import.meta.resolve("@workspace/db"))("pg");

const originalUrl = process.env.DATABASE_URL;
assert.ok(originalUrl, "A development database is required.");
assert.ok(process.env.CMC_API_KEY, "The integration check requires CMC_API_KEY.");
const name = `ehc_cache_check_${Date.now()}`;
assert.match(name, /^ehc_cache_check_\d+$/);
const admin = new pg.Client({ connectionString: originalUrl });
await admin.connect();
let created = false;
let servicePool;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  const isolatedUrl = new URL(originalUrl);
  isolatedUrl.pathname = `/${name}`;
  // Environment is changed only inside this disposable test process.
  process.env.DATABASE_URL = isolatedUrl.toString();
  const isolated = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await isolated.connect();
  try {
    const before = await isolated.query("SELECT to_regclass('public.equity_api_cache') AS cache");
    assert.equal(before.rows[0].cache, null, "The test starts without a cache table.");
  } finally { await isolated.end(); }

  // Exercise the actual configured dev setup, not an alternate handwritten DDL.
  const setup = spawnSync("bash", ["scripts/post-merge.sh"], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    env: process.env, encoding: "utf8", timeout: 180_000,
  });
  assert.equal(setup.status, 0, "Development post-merge schema setup must succeed.");

  const { pool } = await import("@workspace/db");
  servicePool = pool;
  const table = await pool.query("SELECT to_regclass('public.equity_api_cache') AS cache");
  assert.equal(table.rows[0].cache, "equity_api_cache");
  const { getUniverse, getStockDetail, getIssuerDetail } = await import("../src/lib/equity-service.ts");
  const { GetEquityUniverseResponse, GetEquityDetailResponse, GetEquityIssuerResponse } = await import("@workspace/api-zod");
  const universe = GetEquityUniverseResponse.parse(await getUniverse());
  assert.ok(universe.stocks.length > 3);
  const stock = GetEquityDetailResponse.parse(await getStockDetail(14));
  assert.equal(stock.stock.symbol, "TSLA");
  assert.ok(stock.products.length > 0);
  const issuer = GetEquityIssuerResponse.parse(await getIssuerDetail("688ca4ccabae9b5b9fb3167a"));
  assert.ok(issuer.products.length > 0);
  assert.equal(issuer.source.fetchedAt, stock.source.fetchedAt);
  assert.equal(universe.source.fetchedAt, stock.source.fetchedAt);
  assert.equal(issuer.issuer.marketCapUsd, universe.issuers.find(row => row.id === issuer.issuer.id).marketCapUsd);
  console.log("Fresh development database: configured schema setup and all three validated research responses passed.");
} finally {
  if (servicePool) await servicePool.end();
  process.env.DATABASE_URL = originalUrl;
  if (created) await admin.query(`DROP DATABASE "${name}"`);
  await admin.end();
}
