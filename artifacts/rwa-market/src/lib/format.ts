import { useEffect } from 'react';

export const NA = 'N/A';

export function usd(value: number | null | undefined, compact = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NA;
  if (value === 0) return '$0';
  if (compact && Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export function tokenPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NA;
  const digits = Math.abs(value) >= 1 ? 2 : 6;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: digits }).format(value);
}

export function count(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function stamp(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

export function shortAddr(a: string): string {
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

/** Positive finite integer from a query string, else null. */
export function parseNumericId(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || !/^\d{1,12}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Descending sort with null values always last. */
export function byNullLast<T>(get: (t: T) => number | null, dir: 'desc' | 'asc' = 'desc') {
  return (a: T, b: T) => {
    const x = get(a);
    const y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return dir === 'desc' ? y - x : x - y;
  };
}

export function errorStatus(err: unknown): number | null {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') return (err as { status: number }).status;
  return null;
}

export function errorText(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') return (data as { error: string }).error;
  }
  return err instanceof Error ? err.message : 'The request could not be completed.';
}

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [title, description]);
}
