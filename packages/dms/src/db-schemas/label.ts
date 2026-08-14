import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsLabel = pgTable(
  "dms_label",
  {
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isGlobal: boolean("is_global").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id"),
  },
  (table) => [
    index("idx_dms_label_owner").on(table.ownerId),
    index("idx_dms_label_global").on(table.isGlobal),
  ],
);

export type DmsLabel = typeof dmsLabel.$inferSelect;
export type NewDmsLabel = typeof dmsLabel.$inferInsert;
