import { calendarAccessEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const calendar = pgTable(
  "calendar_calendar",
  {
    access: calendarAccessEnum("access").notNull().default("personal"),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description"),
    id: uuidv7("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: text("updated_by"),
  },
  (table) => [
    index("idx_calendar_access").on(table.access),
    index("idx_calendar_owner").on(table.ownerId),
  ],
);

export type Calendar = typeof calendar.$inferSelect;
export type NewCalendar = typeof calendar.$inferInsert;
