import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable(
	"notifications",
	{
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		type: text("type").notNull(),
		to: text("to").notNull(),
		subject: text("subject"),
		body: text("body").notNull(),
		status: text("status").notNull().default("pending"),
		provider: text("provider").notNull(),
		error: text("error"),
		data: jsonb("data").default({}),
		sentAt: timestamp("sent_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		typeIdx: index("idx_notifications_type").on(table.type),
		statusIdx: index("idx_notifications_status").on(table.status),
		toIdx: index("idx_notifications_to").on(table.to),
	}),
);
