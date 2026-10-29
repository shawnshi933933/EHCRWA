import { db, equityApiCacheTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const QUOTE_TTL = 15 * 60 * 1000;
export const METADATA_TTL = 24 * 60 * 60 * 1000;
type Result<T> = { value: T; stale: boolean; fetchedAt: string; expiresAt: string };
const pending = new Map<string, Promise<Result<unknown>>>();
const failures = new Map<string, { until: number; error: Error }>();

/** Shared, durable read-through cache. Coalesce misses and cool down failures. */
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<Result<T>> {
  const [row] = await db.select().from(equityApiCacheTable).where(eq(equityApiCacheTable.key, key));
  const existing = row ? {
    value: row.payload as T, stale: row.expiresAt.getTime() <= Date.now(),
    fetchedAt: row.fetchedAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
  } : null;
  if (existing && !existing.stale) return existing;
  const failure = failures.get(key);
  if (failure && failure.until > Date.now()) {
    if (existing) return existing;
    throw failure.error;
  }
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<Result<T>>;
  const promise = (async (): Promise<Result<T>> => {
    try {
      const value = await load();
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + ttl);
      await db.insert(equityApiCacheTable).values({ key, payload: value, fetchedAt, expiresAt })
        .onConflictDoUpdate({ target: equityApiCacheTable.key, set: { payload: value, fetchedAt, expiresAt } });
      failures.delete(key);
      return { value, stale: false, fetchedAt: fetchedAt.toISOString(), expiresAt: expiresAt.toISOString() };
    } catch (error) {
      const safeError = error instanceof Error ? error : new Error("Market data source unavailable.");
      failures.set(key, { until: Date.now() + 60_000, error: safeError });
      if (existing) return existing;
      throw safeError;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, promise as Promise<Result<unknown>>);
  return promise;
}
