# EHC DEX

EHC DEX is an English, stock-only RWA information platform. It maps underlying stocks to issuer products, networks and contracts using authenticated CoinMarketCap data. It does not provide trading, wallets, routing or order-size calculations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/rwa-market run typecheck` — check the frontend
- `node --test artifacts/api-server/tests/equity-model.test.mjs` — check stock-only filtering, stable IDs, wrapped/derivative handling, null semantics and aggregate consistency
- `pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/tests/fresh-cache.test.mjs` — integration check in a new disposable development database; exercises the configured post-merge schema setup and all three validated research responses, then removes only the test database
- `PORT=19569 BASE_PATH=/ pnpm --filter @workspace/rwa-market run build` — standalone frontend build; managed artifact builds inject these service settings
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required server secrets: `DATABASE_URL` and `CMC_API_KEY`. Never expose these in frontend code or logs.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rwa-market/src/App.tsx` — routing and query configuration
- `artifacts/rwa-market/src/pages/` — Home, Market Map, issuer directory and issuer detail
- `artifacts/rwa-market/src/components/shell.tsx` — navigation, existing EHC logo, source status and methodology
- `artifacts/rwa-market/src/index.css` — visual theme and responsive layout
- `artifacts/api-server/src/lib/cmc.ts` — fixed-host server-only authenticated CMC client and fully paginated catalog
- `artifacts/api-server/src/lib/equity-model.ts` — shared stock/product/issuer matrix and aggregation rules
- `artifacts/api-server/src/lib/equity-service.ts` — cached quote universe, profiles and contract enrichment
- `artifacts/api-server/src/routes/equities.ts` — validated read-only API routes
- `lib/api-spec/openapi.yaml` — API contract; regenerate client and Zod helpers after changes
- `lib/db/src/schema/api-cache.ts` — replaceable Postgres cache, no user data
- `scripts/post-merge.sh` — configured non-interactive DEVELOPMENT setup; installs locked dependencies, applies the Drizzle schema to dev and builds shared library declarations

## Database lifecycle

The cache table is part of the Drizzle schema, applied to development by the configured post-merge script (or `pnpm --filter @workspace/db run push` during development). For Replit-managed production databases, Publish automatically diffs the development schema against production and applies the schema change. This is the production migration path: do not add startup-time DDL, a custom production migration, or schema pushes to a production build command. See `.local/skills/database/references/database-migrations-on-publish.md`. App startup intentionally does not mutate production schema.

## Architecture decisions

- The obsolete simulated trading/fee estimator has been removed. Real research data is fetched by the API server, never by the browser using a secret. The user has separately approved clearly labeled, client-side CEX/DEX demo data for visual previews, not as a backend fallback.
- The stock directory walks all CMC map pages and checks `asset_type === "stock"`; only entries CMC flags as having tokens are loaded into the research universe. The directory is source coverage, not global market coverage.
- Identity is `rwa_id` → `crypto_id` → `issuer_id`, with contracts/networks subordinate to products. Ticker strings are not identifiers.
- Both research views project the same server-cached matrix. Quote cache is 15 minutes, catalog/company/contract metadata 24 hours. The client automatically checks just after snapshot expiry (bounded to 1–15 minutes), pauses interval polling in hidden tabs, and refreshes on return/reconnection. Errors retain existing data and retry automatically. There is no healthy-state manual refresh button.
- Customer-facing UI uses neutral market wording, a simple updated timestamp and automatic/delayed update status, not provider/API/cache/expiry diagnostics. Technical source metadata remains intact in the API; methodology retains an external market-data reference. The top-right scope caption has been removed at the user's request.
- Expired upstream cache may serve last successful data only with explicit stale status. Source errors, permissions, missing data and zero are distinct; there is no mock fallback.
- Issuer sums count distinct non-wrapped products, not contracts; source-classified derivatives are excluded. Explicitly named wrapped products are excluded from issuer sums, but unresolved wraps may remain. CMC-reported stock aggregates are not relabeled as deduplicated and can differ from issuer sums.
- Group products by underlying stock only for discovery; issuer, chain, legal wrapper, rights, pricing basis, and redemption may differ.
- Contract metadata is attributed to CMC, not independently audited. Never infer rights, share ratios, dividends, redemption or regional eligibility.

## Product

- `/` preserves the project introduction and existing brand concept, linking directly to both research views.
- `/market-map?stock=14&issuer=...&token=...` provides the requested left-to-right stock → issuer/token → market context relationship map. The stock directory opens by default. Lines show relationships, not measured flows.
- `/issuers` and `/issuers/:issuerId` provide searchable issuer coverage, stock-product rankings and network filters. Product links return to the selected map context.
- The user explicitly approved proceeding with existing API permissions. CMC market-pair endpoints currently return subscription HTTP 403; the UI explains this live-data gap and links to actual CMC token pages. At the user's later request, the map also contains a separate, explicitly labeled Demo data CEX/DEX preview for the selected product. Fictional venues, sample prices, volume, spreads and depth must never be attributed to CMC, merged into real aggregates, or presented as actual listings. Issuer pages remain based on real research data.
- The connected RWA endpoints do not return underlying stock price or equity market cap, so these show N/A with an explanation, separate from token price and tokenized cap. Company/IR/filings resources are curated for Tesla, Apple and NVIDIA, with SEC links from source CIK where provided.
- Recheck data rights and API entitlements before public redistribution. No subscriptions are purchased by the application.

## User preferences

The interface is written in English, while issuer, token, and network names retain their official names.

## Brand and content

- Core message: **A quote is not liquidity.** Supporting copy: **Price shows the edge. Depth shows the market.**
- The uploaded EHC DEX concept is the visual reference: near-black/navy surfaces, blue-purple liquidity structures, and restrained gold flow accents. These are proposed UI colors, not precisely extracted brand tokens.
- Use the existing blue-purple 3D E emblem, not a newly designed substitute. The current logo and favicon are cropped and background-removed from the user's uploaded brand artwork, not original assets downloaded from X. Concept artwork is not a quantitative depth chart.
- Explain stock discovery, issuer differences, source coverage and market-data availability. Do not reintroduce execution roadmaps into this information-only phase.
- Brand concept illustrations are explicitly non-quantitative. Project messaging is based on supplied brand materials, not a claimed comprehensive X account analysis.

## Gotchas

Never call cached data real-time, report missing data as zero, label volume as liquidity/depth, or claim coverage beyond the source. Missing market permissions are an explicitly approved delivery limitation, not completed venue ingestion.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
