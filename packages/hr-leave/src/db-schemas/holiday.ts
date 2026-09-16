import { holidayTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const holidayList = pgTable("holiday_list", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  weekly_off_days: jsonb(),
  year: integer().notNull(),
});

export const holiday = pgTable(
  "holiday",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    description: text(),
    holiday_list_id: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    type: holidayTypeEnum().notNull().default("public"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_holiday_holiday_list_id").on(table.holiday_list_id)],
);
