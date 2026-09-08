import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsClass = pgTable("dms_class", {
  color: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  created_by: text().notNull(),
  description: text(),
  file_naming_schema: text(),
  icon: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  retention_days: integer(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type DmsClass = typeof dmsClass.$inferSelect;
export type NewDmsClass = typeof dmsClass.$inferInsert;
