# EHC DEX

EHC DEX groups tokenized equity products by underlying stock for discovery and compares issuer, network, price basis, verification status, and simulated order-size costs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/rwa-market run typecheck` — check the frontend
- `node --test artifacts/rwa-market/tests/market.test.mjs` — check shared simulated fee, output, and exposure calculations
- `PORT=19569 BASE_PATH=/ pnpm --filter @workspace/rwa-market run build` — standalone frontend build; managed artifact builds inject these service settings
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
- `artifacts/rwa-market/src/components/brand.tsx` — EHC DEX identity, concept illustration, and feature messaging
- `artifacts/rwa-market/src/data/market.ts` — explicitly simulated asset examples and shared order-size estimate model
- `artifacts/rwa-market/src/index.css` — visual theme and responsive layout
- `lib/api-spec/openapi.yaml` — shared API contract, currently unrelated to the frontend prototype

## Architecture decisions

- The first version is a frontend-only prototype; it does not call APIs, wallets, RPCs, or trading services.
- Example product data, prices, depth, fees, gas, and slippage are fabricated for interaction previews and must remain labeled as simulated.
- Group products by underlying stock only for discovery; issuer, chain, legal wrapper, rights, pricing basis, and redemption may differ.
- Keep unknown contract, dividend/rebase, regional eligibility, and venue details marked as unverified rather than filling in assumptions.

## Product

Search TSLA, AAPL, and NVDA examples; compare issuer versions by chain, token price, per-token illustrative underlying exposure, simulated depth, and quote status; change the input asset and amount to recalculate a local-only estimate.

The brand introduction leads into the market workbench. Quote preview and order-size scenarios share one calculation model. The model assumptions, fixed demo exchange rates, and non-executable nature of the examples are disclosed in the scenario section.

## User preferences

The interface is written in English, while issuer, token, and network names retain their official names.

## Brand and content

- Core message: **A quote is not liquidity.** Supporting copy: **Price shows the edge. Depth shows the market.**
- The uploaded EHC DEX concept is the visual reference: near-black/navy surfaces, blue-purple liquidity structures, and restrained gold flow accents. These are proposed UI colors, not precisely extracted brand tokens.
- Use the existing blue-purple 3D E emblem, not a newly designed substitute. The current logo and favicon are cropped and background-removed from the user's uploaded brand artwork, not original assets downloaded from X. Concept artwork is not a quantitative depth chart.
- Explain discovery across issuer wrappers, exposure-aware comparison, and order-size context. Mark cross-chain execution as **Planned**, not available.
- X profile/posts were not accessible during planning; no messaging, partnerships, or statistics from that account have been verified or incorporated.
- Simulated model output must disclose its assumptions and units. It is not executable liquidity, a guarantee of fills, or an investment recommendation.

## Gotchas

Never present this prototype's mock prices or quote estimates as live data, verified issuer terms, investment guidance, or executable trades.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
