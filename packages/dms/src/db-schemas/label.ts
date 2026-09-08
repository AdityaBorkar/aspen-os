import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsLabel = pgTable(
  "dms_label",
  {
    color: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_global: boolean().notNull().default(false),
    name: text().notNull(),
    owner_id: text(),
  },
  (table) => [
    index("idx_dms_label_owner").on(table.owner_id),
    index("idx_dms_label_global").on(table.is_global),
  ],
);

export type DmsLabel = typeof dmsLabel.$inferSelect;
export type NewDmsLabel = typeof dmsLabel.$inferInsert;
