import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsLegalHold = pgTable(
  "dms_legal_hold",
  {
    file_id: text().notNull(),
    id: uuidv7().primaryKey(),
    placed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    placed_by: text().notNull(),
    reason: text().notNull(),
    released_at: timestamp({ withTimezone: true }),
    released_by: text(),
  },
  (table) => [
    index("idx_dms_legal_hold_file").on(table.file_id),
    index("idx_dms_legal_hold_released").on(table.released_at),
  ],
);

export type DmsLegalHold = typeof dmsLegalHold.$inferSelect;
export type NewDmsLegalHold = typeof dmsLegalHold.$inferInsert;
