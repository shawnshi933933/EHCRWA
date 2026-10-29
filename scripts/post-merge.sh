#!/bin/bash
set -euo pipefail

# This is Replit's DEVELOPMENT-only post-merge setup, not a production
# build/startup migration. Publish applies the managed dev/prod schema diff.
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force
pnpm run typecheck:libs
