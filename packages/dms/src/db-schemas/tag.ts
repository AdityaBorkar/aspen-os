import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsTag = pgTable(
  "dms_tag",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    name: text("name").notNull().unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_dms_tag_name").on(table.name)],
);

export type DmsTag = typeof dmsTag.$inferSelect;
export type NewDmsTag = typeof dmsTag.$inferInsert;
