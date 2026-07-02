import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const distributedLocks = pgTable("distributed_locks", {
	key: text("key").primaryKey(),
	owner: text("owner").notNull(),
	acquiredAt: timestamp("acquired_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
