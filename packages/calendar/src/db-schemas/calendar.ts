import { calendarAccessEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendar = pgTable(
  "calendar_calendar",
  {
    access: calendarAccessEnum().notNull().default("personal"),
    color: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    description: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    name: text().notNull(),
    owner_id: text().notNull(),
    timezone: text().notNull().default("UTC"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updated_by: text(),
  },
  (table) => [
    index("idx_calendar_access").on(table.access),
    index("idx_calendar_owner").on(table.owner_id),
  ],
);

export type Calendar = typeof calendar.$inferSelect;
export type NewCalendar = typeof calendar.$inferInsert;
