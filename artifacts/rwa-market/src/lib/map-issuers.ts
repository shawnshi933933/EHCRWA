export const MAP_ISSUER_LIMIT = 5;

type MapProduct = { id: number; issuerId: string; marketCapUsd: number | null; isWrapped: boolean };
export type MapIssuerGroup<T extends MapProduct> = {
  issuerId: string;
  name: string;
  products: T[];
  capSum: number | null;
  capHasNull: boolean;
};

function descendingNullable(a: number | null, b: number | null): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return b - a;
}

/** Map-only projection: hide wrappers before grouping/ranking; never mutate source totals. */
export function buildMapIssuerGroups<T extends MapProduct>(
  products: readonly T[],
  issuers: ReadonlyMap<string, { name: string }>,
): { allGroups: MapIssuerGroup<T>[]; groups: MapIssuerGroup<T>[] } {
  const byIssuer = new Map<string, T[]>();
  for (const product of products) {
    if (product.isWrapped) continue;
    const list = byIssuer.get(product.issuerId) ?? [];
    list.push(product);
    byIssuer.set(product.issuerId, list);
  }
  const allGroups = [...byIssuer].map(([issuerId, list]) => {
    const sorted = [...list].sort((a, b) => descendingNullable(a.marketCapUsd, b.marketCapUsd) || a.id - b.id);
    const caps = sorted.flatMap(p => p.marketCapUsd === null ? [] : [p.marketCapUsd]);
    return {
      issuerId, name: issuers.get(issuerId)?.name ?? issuerId, products: sorted,
      capSum: caps.length ? caps.reduce((a, b) => a + b, 0) : null,
      capHasNull: sorted.some(p => p.marketCapUsd === null),
    };
  }).sort((a, b) => descendingNullable(a.capSum, b.capSum) || a.issuerId.localeCompare(b.issuerId));
  return { allGroups, groups: allGroups.slice(0, MAP_ISSUER_LIMIT) };
}
