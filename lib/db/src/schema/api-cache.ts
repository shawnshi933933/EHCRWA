import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Non-personal, replaceable read-through cache of authenticated market data. */
export const equityApiCacheTable = pgTable("equity_api_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
