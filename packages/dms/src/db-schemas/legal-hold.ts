import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsLegalHold = pgTable(
  "dms_legal_hold",
  {
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    placedBy: text("placed_by").notNull(),
    reason: text("reason").notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releasedBy: text("released_by"),
  },
  (table) => [
    index("idx_dms_legal_hold_file").on(table.fileId),
    index("idx_dms_legal_hold_released").on(table.releasedAt),
  ],
);

export type DmsLegalHold = typeof dmsLegalHold.$inferSelect;
export type NewDmsLegalHold = typeof dmsLegalHold.$inferInsert;
