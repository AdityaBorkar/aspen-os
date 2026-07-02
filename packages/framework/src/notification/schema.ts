import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable(
  "notifications",
  {
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    data: jsonb("data").default({}),
    error: text("error"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    provider: text("provider").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    subject: text("subject"),
    to: text("to").notNull(),
    type: text("type").notNull(),
  },
  (table) => ({
    statusIdx: index("idx_notifications_status").on(table.status),
    toIdx: index("idx_notifications_to").on(table.to),
    typeIdx: index("idx_notifications_type").on(table.type),
  }),
);
