const MIN_REFRESH = 60_000;
const MAX_REFRESH = 15 * 60_000;

/** Follow the shared snapshot's expiry, rather than polling the provider per visitor. */
export function marketRefreshDelay(data: unknown, now = Date.now()): number {
  if (!data || typeof data !== 'object' || !('source' in data)) return MIN_REFRESH;
  const source = data.source;
  if (!source || typeof source !== 'object' || !('expiresAt' in source) || typeof source.expiresAt !== 'string') return MIN_REFRESH;
  const expiry = Date.parse(source.expiresAt);
  if (!Number.isFinite(expiry)) return MIN_REFRESH;
  // Refresh just after expiry; on failure back off to a minute, matching server cooldown.
  return Math.max(MIN_REFRESH, Math.min(MAX_REFRESH, expiry - now + 1_000));
}
