# RWA 股票聚合器

按底层股票代码归组并比较不同发行方、不同链上的 RWA 股票代币，展示价格口径差异与明确的核验状态。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/rwa-market run typecheck` — check the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rwa-market/src/App.tsx` — single-page asset comparison and local quote calculator
- `artifacts/rwa-market/src/index.css` — visual theme and responsive layout
- `lib/api-spec/openapi.yaml` — shared API contract, currently unrelated to the frontend prototype

## Architecture decisions

- The first version is a frontend-only prototype; it does not call APIs, wallets, RPCs, or trading services.
- Example product data, prices, depth, fees, gas, and slippage are fabricated for interaction previews and must remain labeled as simulated.
- Group products by underlying stock only for discovery; issuer, chain, legal wrapper, rights, pricing basis, and redemption may differ.
- Keep unknown contract, dividend/rebase, regional eligibility, and venue details marked as unverified rather than filling in assumptions.

## Product

Search TSLA, AAPL, and NVDA examples; compare issuer versions by chain, token price, per-token illustrative underlying exposure, simulated depth, and quote status; change the input asset and amount to recalculate a local-only estimate.

## User preferences

The interface is written in Chinese, while issuer, token, and network names retain their official names.

## Gotchas

Never present this prototype's mock prices or quote estimates as live data, verified issuer terms, investment guidance, or executable trades.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
