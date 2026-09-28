import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Web Push (RFC 8030) subscriptions. Global (control-plane) rather than
 * per-tenant: the push endpoint is issued per browser profile, and one user
 * visiting several workspaces would otherwise duplicate the same device. Each
 * tenant's `notify()` fans out to every subscription the recipient owns.
 */
export const commsPushSubscription = pgTable(
  "push_subscription",
  {
    auth: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endpoint: text().notNull(),
    id: uuidv7().primaryKey(),
    origin: text(),
    p256dh: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_agent: text(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_push_subscription_user").on(table.user_id),
    uniqueIndex("uq_push_subscription_endpoint").on(table.endpoint),
  ],
);

export type CommsPushSubscription = typeof commsPushSubscription.$inferSelect;
export type NewCommsPushSubscription = typeof commsPushSubscription.$inferInsert;
